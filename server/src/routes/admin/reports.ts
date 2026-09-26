import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { logAudit } from '../../services/auditLogger';

const router = Router();

// Confidentiality notice adhering to Rule 5 & RA 10173 (Data Privacy Act of 2012)
const DPA_CSV_WATERMARK =
  '# -----------------------------------------------------------------------------\n' +
  '# CONFIDENTIALITY & DATA PRIVACY NOTICE (RULE 5 & REPUBLIC ACT NO. 10173)\n' +
  '# CTU-Naga Alumni Connect — Centralized Career Analytics & Alumni Records\n' +
  '# This report contains protected alumni personal and career information.\n' +
  '# Unauthorized copying, disclosure, or distribution is strictly prohibited.\n' +
  '# Exported for authorized institutional analytics only. Store securely.\n' +
  '# -----------------------------------------------------------------------------\n';

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return (arr || []).reduce((acc: Record<string, T[]>, item: T) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function buildCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) {
    return '\ufeff' + DPA_CSV_WATERMARK + '# No records found\n';
  }
  const headers = Object.keys(rows[0]);
  const csv = rows.map((r) =>
    headers
      .map((h) => {
        const val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return '\ufeff' + DPA_CSV_WATERMARK + [headers.join(','), ...csv].join('\n');
}

function clientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
}

async function recordReportExport(
  req: AuthenticatedRequest,
  params: {
    reportName: string;
    reportType: string;
    format: string;
    recordCount: number;
    filters?: Record<string, any>;
  }
) {
  try {
    const userId = req.user?.userId;
    const adminEmail = req.user?.email || 'Administrator';

    await supabase.from('report_exports').insert({
      user_id: userId || null,
      admin_email: adminEmail,
      report_name: params.reportName,
      report_type: params.reportType,
      format: params.format,
      record_count: params.recordCount,
      filters: params.filters || {},
      ip_address: clientIp(req),
      user_agent: req.headers['user-agent'] as string,
    });

    await logAudit(req, {
      actorId: userId,
      actorName: adminEmail,
      actorRole: 'admin',
      action: 'REPORT_EXPORTED',
      entity: 'reports',
      details: {
        reportName: params.reportName,
        reportType: params.reportType,
        format: params.format,
        recordCount: params.recordCount,
        filters: params.filters,
      },
      severity: 'info',
      status: 'success',
    });
  } catch (err) {
    console.error('[reports] Failed to log report export:', err);
  }
}

// -----------------------------------------------------------------------------
// GET /api/admin/reports/stats - Live summary numbers across all modules
// -----------------------------------------------------------------------------
router.get('/stats', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const [
      usersRes,
      empRes,
      companiesRes,
      surveysRes,
      responsesRes,
      jobsRes,
      skillsRes,
      exportsRes,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'alumni'),
      supabase.from('employment').select('employment_status, is_current'),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('surveys').select('id', { count: 'exact', head: true }),
      supabase.from('survey_responses').select('id', { count: 'exact', head: true }),
      supabase.from('job_postings').select('id', { count: 'exact', head: true }),
      supabase.from('skills').select('name'),
      supabase.from('report_exports').select('id', { count: 'exact', head: true }),
    ]);

    const currentEmployment = (empRes.data || []).filter((e: any) => e.is_current);
    const employed = currentEmployment.filter((e: any) => e.employment_status === 'employed').length;
    const selfEmployed = currentEmployment.filter((e: any) =>
      ['self-employed', 'entrepreneur'].includes(e.employment_status)
    ).length;
    const unemployed = currentEmployment.filter((e: any) =>
      ['unemployed', 'seeking'].includes(e.employment_status)
    ).length;

    const uniqueSkills = new Set((skillsRes.data || []).map((s: any) => (s.name || '').trim().toLowerCase()));

    res.json({
      totalAlumni: usersRes.count || 0,
      totalEmployed: employed + selfEmployed,
      employed,
      selfEmployed,
      unemployed,
      totalCompanies: companiesRes.count || 0,
      totalSurveys: surveysRes.count || 0,
      totalSurveyResponses: responsesRes.count || 0,
      totalJobPostings: jobsRes.count || 0,
      totalUniqueSkills: uniqueSkills.size,
      totalExportsLogged: exportsRes.count || 0,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/export-history - Real-time audit history of report exports
// -----------------------------------------------------------------------------
router.get('/export-history', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const { data: exports, error } = await supabase
      .from('report_exports')
      .select('*')
      .order('exported_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json(exports || []);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/alumni - Alumni Master Registry
// -----------------------------------------------------------------------------
router.get('/alumni', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const programFilter = req.query.program as string;
    const batchFilter = req.query.batch as string;
    const statusFilter = req.query.status as string;
    const empStatusFilter = req.query.employment_status as string;

    const { data: usersData, error: uErr } = await supabase
      .from('users')
      .select('id, email, role, is_verified, is_active, is_archived, last_login, created_at')
      .eq('role', 'alumni')
      .order('created_at', { ascending: false });

    if (uErr) throw new AppError(uErr.message, 500);
    let users = usersData || [];
    const userIds = users.map((u: any) => u.id).filter(Boolean);

    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const profileList = profiles || [];
      const profileIds = profileList.map((p: any) => p.id).filter(Boolean);
      const userToProfileMap = new Map(profileList.map((p: any) => [p.user_id, p]));

      let education: any[] = [];
      let employment: any[] = [];
      if (profileIds.length > 0) {
        const [edRes, empRes] = await Promise.all([
          supabase.from('education').select('*').in('profile_id', profileIds),
          supabase.from('employment').select('*').in('profile_id', profileIds),
        ]);
        education = edRes.data || [];
        employment = empRes.data || [];
      }

      const eduByProfile = groupBy(education, 'profile_id');
      const empByProfile = groupBy(employment, 'profile_id');

      users = users.map((u: any) => {
        const prof = userToProfileMap.get(u.id);
        const profId = prof?.id;
        return {
          ...u,
          profile: prof || null,
          education: profId ? eduByProfile[profId] || [] : [],
          employment: profId ? empByProfile[profId] || [] : [],
        };
      });
    }

    // Apply filters
    if (programFilter) {
      users = users.filter((u: any) =>
        (u.education || []).some((e: any) => (e.program || '').toLowerCase().includes(programFilter.toLowerCase()))
      );
    }
    if (batchFilter) {
      users = users.filter((u: any) =>
        (u.education || []).some((e: any) => String(e.year_graduated) === String(batchFilter))
      );
    }
    if (statusFilter === 'verified') users = users.filter((u: any) => u.is_verified);
    if (statusFilter === 'unverified') users = users.filter((u: any) => !u.is_verified);
    if (empStatusFilter) {
      users = users.filter((u: any) => {
        const currentEmp = (u.employment || []).find((e: any) => e.is_current) || (u.employment || [])[0];
        return (currentEmp?.employment_status || u.profile?.employment_status || '').toLowerCase() === empStatusFilter.toLowerCase();
      });
    }

    const rows = users.map((u: any) => {
      const ed = (u.education || [])[0] || {};
      const emp = (u.employment || []).find((e: any) => e.is_current) || (u.employment || [])[0] || {};
      return {
        'User ID': u.id,
        'Email Address': u.email,
        'First Name': u.profile?.first_name || '',
        'Last Name': u.profile?.last_name || '',
        'ID Number': u.profile?.id_number || '',
        'Degree Program': ed.program || '',
        'Major': ed.major || '',
        'Graduation Year': ed.year_graduated || '',
        'Employment Status': emp.employment_status || u.profile?.employment_status || 'N/A',
        'Current Position': emp.position || '',
        'Current Company': emp.company_name || '',
        'Industry': emp.company_industry || '',
        'Salary Range': emp.salary_range || '',
        'Phone': u.profile?.phone || '',
        'City': u.profile?.city || '',
        'Province': u.profile?.province || '',
        'Country': u.profile?.country || 'Philippines',
        'Verified': u.is_verified ? 'Yes' : 'No',
        'Registered Date': u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      };
    });

    await recordReportExport(req, {
      reportName: 'Alumni Master List',
      reportType: 'alumni_list',
      format,
      recordCount: rows.length,
      filters: { program: programFilter, batch: batchFilter, status: statusFilter, employment_status: empStatusFilter },
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni-master-list.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows, raw: users });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/employment - Graduate Employment Tracker
// -----------------------------------------------------------------------------
router.get('/employment', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const programFilter = req.query.program as string;
    const batchFilter = req.query.batch as string;
    const statusFilter = req.query.employment_status as string;
    const jobTypeFilter = req.query.job_type as string;
    const industryFilter = req.query.industry as string;

    const { data: employmentData, error: empErr } = await supabase
      .from('employment')
      .select('*')
      .order('start_date', { ascending: false });

    if (empErr) throw new AppError(empErr.message, 500);
    let employment = employmentData || [];
    const profileIds = employment.map((e: any) => e.profile_id).filter(Boolean);

    if (profileIds.length > 0) {
      const [{ data: profiles }, { data: education }] = await Promise.all([
        supabase.from('profiles').select('id, user_id, first_name, last_name, email, id_number').in('id', profileIds),
        supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
      ]);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const eduByProfile = groupBy(education || [], 'profile_id');
      employment = employment.map((e: any) => ({
        ...e,
        profile: profileMap.get(e.profile_id) || null,
        education: eduByProfile[e.profile_id] || [],
      }));
    }

    if (programFilter) {
      employment = employment.filter((e: any) =>
        (e.education || []).some((ed: any) => (ed.program || '').toLowerCase().includes(programFilter.toLowerCase()))
      );
    }
    if (batchFilter) {
      employment = employment.filter((e: any) =>
        (e.education || []).some((ed: any) => String(ed.year_graduated) === String(batchFilter))
      );
    }
    if (statusFilter) {
      employment = employment.filter((e: any) => (e.employment_status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (jobTypeFilter) {
      employment = employment.filter((e: any) => (e.job_type || '').toLowerCase() === jobTypeFilter.toLowerCase());
    }
    if (industryFilter) {
      employment = employment.filter((e: any) => (e.company_industry || '').toLowerCase().includes(industryFilter.toLowerCase()));
    }

    const rows = employment.map((e: any) => ({
      'Alumni Name': `${e.profile?.first_name || ''} ${e.profile?.last_name || ''}`.trim(),
      'Email': e.profile?.email || '',
      'ID Number': e.profile?.id_number || '',
      'Degree Program': e.education?.[0]?.program || '',
      'Graduation Year': e.education?.[0]?.year_graduated || '',
      'Company Name': e.company_name || '',
      'Industry': e.company_industry || '',
      'Position / Job Title': e.position || '',
      'Employment Status': e.employment_status || '',
      'Job Type': e.job_type || '',
      'Current Position': e.is_current ? 'Yes' : 'No',
      'Salary Range': e.salary_range || 'Undisclosed',
      'Start Date': e.start_date || '',
      'End Date': e.end_date || (e.is_current ? 'Present' : ''),
    }));

    await recordReportExport(req, {
      reportName: 'Graduate Employment Report',
      reportType: 'employment_report',
      format,
      recordCount: rows.length,
      filters: { program: programFilter, batch: batchFilter, status: statusFilter, job_type: jobTypeFilter, industry: industryFilter },
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=graduate-employment-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows, raw: employment });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/career-progress - Career Trajectory & Progression
// -----------------------------------------------------------------------------
router.get('/career-progress', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const { data: employmentData } = await supabase
      .from('employment')
      .select('*')
      .order('profile_id')
      .order('start_date', { ascending: true });

    const employment = employmentData || [];
    const profileIds = Array.from(new Set(employment.map((e: any) => e.profile_id).filter(Boolean)));

    let profiles: any[] = [];
    let education: any[] = [];
    if (profileIds.length > 0) {
      const [pRes, edRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, email, id_number').in('id', profileIds),
        supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
      ]);
      profiles = pRes.data || [];
      education = edRes.data || [];
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const eduMap = new Map(education.map((ed: any) => [ed.profile_id, ed]));

    const careerPaths: Record<string, any> = {};
    employment.forEach((e: any) => {
      const pid = e.profile_id;
      if (!careerPaths[pid]) {
        careerPaths[pid] = {
          profile: profileMap.get(pid) || {},
          education: eduMap.get(pid) || {},
          positions: [],
        };
      }
      careerPaths[pid].positions.push(e);
    });

    const rows = Object.values(careerPaths).flatMap((cp: any) => {
      const posList = cp.positions || [];
      const firstPos = posList[0] || {};
      const latestPos = posList[posList.length - 1] || {};
      return posList.map((p: any, idx: number) => ({
        'Alumni Name': `${cp.profile?.first_name || ''} ${cp.profile?.last_name || ''}`.trim(),
        'Email': cp.profile?.email || '',
        'Degree Program': cp.education?.program || '',
        'Graduation Year': cp.education?.year_graduated || '',
        'Position Order': idx + 1,
        'Company': p.company_name,
        'Position': p.position,
        'Industry': p.company_industry || '',
        'Job Type': p.job_type || '',
        'Start Date': p.start_date || '',
        'End Date': p.end_date || (p.is_current ? 'Present' : ''),
        'Total Positions Tracked': posList.length,
        'Progression Summary': posList.length > 1 ? `${firstPos.position} → ${latestPos.position}` : 'Initial Role',
      }));
    });

    await recordReportExport(req, {
      reportName: 'Career Progression & Trajectory Report',
      reportType: 'career_progression',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=career-progression-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/salary-distribution - Salary Analytics Report
// -----------------------------------------------------------------------------
router.get('/salary-distribution', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const { data: employment } = await supabase
      .from('employment')
      .select('salary_range, company_industry, position, company_name, profile_id')
      .eq('is_current', true)
      .not('salary_range', 'is', null);

    const brackets: Record<string, number> = {
      'Below ₱10,000': 0,
      '₱10,001 - ₱20,000': 0,
      '₱20,001 - ₱30,000': 0,
      '₱30,001 - ₱50,000': 0,
      '₱50,001 - ₱75,000': 0,
      '₱75,001 - ₱100,000': 0,
      'Above ₱100,000': 0,
    };

    const industrySalaries: Record<string, number[]> = {};
    const parsedValues: number[] = [];

    (employment || []).forEach((e: any) => {
      const clean = String(e.salary_range).replace(/[₱,,\s]/g, '');
      const parts = clean.split('-').map((n) => parseFloat(n)).filter((n) => !isNaN(n));
      if (parts.length > 0) {
        const avg = parts.length === 1 ? parts[0] : (parts[0] + parts[1]) / 2;
        parsedValues.push(avg);

        if (avg <= 10000) brackets['Below ₱10,000']++;
        else if (avg <= 20000) brackets['₱10,001 - ₱20,000']++;
        else if (avg <= 30000) brackets['₱20,001 - ₱30,000']++;
        else if (avg <= 50000) brackets['₱30,001 - ₱50,000']++;
        else if (avg <= 75000) brackets['₱50,001 - ₱75,000']++;
        else if (avg <= 100000) brackets['₱75,001 - ₱100,000']++;
        else brackets['Above ₱100,000']++;

        const ind = e.company_industry || 'Unspecified';
        if (!industrySalaries[ind]) industrySalaries[ind] = [];
        industrySalaries[ind].push(avg);
      }
    });

    const totalReported = parsedValues.length;
    const avgSalary = totalReported > 0 ? Math.round(parsedValues.reduce((a, b) => a + b, 0) / totalReported) : 0;
    const highestSalary = totalReported > 0 ? Math.round(Math.max(...parsedValues)) : 0;
    const lowestSalary = totalReported > 0 ? Math.round(Math.min(...parsedValues)) : 0;

    const rows = Object.entries(brackets).map(([bracket, count]) => ({
      'Salary Bracket': bracket,
      'Alumni Count': count,
      'Percentage (%)': totalReported > 0 ? `${Math.round((count / totalReported) * 100)}%` : '0%',
      'National Currency': 'PHP (₱)',
    }));

    await recordReportExport(req, {
      reportName: 'Salary Distribution Report',
      reportType: 'salary_distribution',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=salary-distribution-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({
      summary: { totalReported, avgSalary, highestSalary, lowestSalary },
      data: rows,
      brackets: Object.entries(brackets).map(([range, count]) => ({ range, count })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/employment-by-course - Employment Rate by Program
// -----------------------------------------------------------------------------
router.get('/employment-by-course', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const yearFilter = req.query.year || req.query.batch;

    const [{ data: education }, { data: employment }] = await Promise.all([
      supabase.from('education').select('profile_id, program, year_graduated'),
      supabase.from('employment').select('profile_id, employment_status, is_current').eq('is_current', true),
    ]);

    const empStatusMap = new Map<string, string>();
    (employment || []).forEach((e: any) => {
      empStatusMap.set(e.profile_id, (e.employment_status || '').toLowerCase());
    });

    const courseStats: Record<string, { total: number; employed: number; selfEmployed: number; unemployed: number }> = {};

    (education || []).forEach((e: any) => {
      if (!e.program) return;
      if (yearFilter && String(e.year_graduated) !== String(yearFilter)) return;

      const prog = e.program.trim();
      if (!courseStats[prog]) courseStats[prog] = { total: 0, employed: 0, selfEmployed: 0, unemployed: 0 };
      courseStats[prog].total++;

      const status = empStatusMap.get(e.profile_id);
      if (status === 'employed') courseStats[prog].employed++;
      else if (status === 'self-employed' || status === 'entrepreneur') courseStats[prog].selfEmployed++;
      else courseStats[prog].unemployed++;
    });

    const rows = Object.entries(courseStats)
      .map(([program, s]) => {
        const employedTotal = s.employed + s.selfEmployed;
        return {
          'Academic Program': program,
          'Total Graduates': s.total,
          'Employed Count': s.employed,
          'Self-Employed Count': s.selfEmployed,
          'Unemployed / Seeking': s.unemployed,
          'Employment Rate (%)': s.total > 0 ? `${Math.round((employedTotal / s.total) * 100)}%` : '0%',
        };
      })
      .sort((a, b) => b['Total Graduates'] - a['Total Graduates']);

    await recordReportExport(req, {
      reportName: 'Employment Rate by Course Report',
      reportType: 'employment_by_course',
      format,
      recordCount: rows.length,
      filters: { year: yearFilter },
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=employment-by-course.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/batch-employment - Graduation Batch Outcomes
// -----------------------------------------------------------------------------
router.get('/batch-employment', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const [{ data: education }, { data: employment }] = await Promise.all([
      supabase.from('education').select('profile_id, year_graduated'),
      supabase.from('employment').select('profile_id, is_current, employment_status').eq('is_current', true),
    ]);

    const empMap = new Map<string, string>();
    (employment || []).forEach((e: any) => {
      empMap.set(e.profile_id, (e.employment_status || '').toLowerCase());
    });

    const batchStats: Record<string, { total: number; employed: number; unemployed: number }> = {};

    (education || []).forEach((e: any) => {
      if (!e.year_graduated) return;
      const batch = String(e.year_graduated);
      if (!batchStats[batch]) batchStats[batch] = { total: 0, employed: 0, unemployed: 0 };
      batchStats[batch].total++;

      const st = empMap.get(e.profile_id);
      if (st === 'employed' || st === 'self-employed' || st === 'entrepreneur') {
        batchStats[batch].employed++;
      } else {
        batchStats[batch].unemployed++;
      }
    });

    const rows = Object.entries(batchStats)
      .map(([batch, s]) => ({
        'Graduation Batch': batch,
        'Graduates Tracked': s.total,
        'Employed Graduates': s.employed,
        'Unemployed / Seeking': s.unemployed,
        'Employment Rate (%)': s.total > 0 ? `${Math.round((s.employed / s.total) * 100)}%` : '0%',
      }))
      .sort((a, b) => Number(b['Graduation Batch']) - Number(a['Graduation Batch']));

    await recordReportExport(req, {
      reportName: 'Batch Employment Trends Report',
      reportType: 'batch_employment',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=batch-employment-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/degree-alignment - Curriculum & Degree Alignment
// -----------------------------------------------------------------------------
router.get('/degree-alignment', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const [{ data: education }, { data: employment }] = await Promise.all([
      supabase.from('education').select('profile_id, program'),
      supabase.from('employment').select('profile_id, company_industry, position, is_current').eq('is_current', true),
    ]);

    const INDUSTRY_KEYWORDS = [
      { keywords: ['education', 'teaching', 'school', 'training', 'academic', 'beed', 'bsed', 'btled'], industries: ['Education', 'Academic', 'School'] },
      { keywords: ['industrial technology', 'technology', 'engineering', 'industrial', 'manufacturing', 'bit'], industries: ['Technology', 'Industrial', 'Engineering', 'Manufacturing'] },
      { keywords: ['information technology', 'computer', 'software', 'it ', 'data', 'developer', 'programmer', 'bsit'], industries: ['Information Technology', 'IT', 'Software', 'Computer'] },
      { keywords: ['accounting', 'business', 'finance', 'management', 'commerce'], industries: ['Accounting', 'Business', 'Finance'] },
      { keywords: ['hospitality', 'hotel', 'restaurant', 'food', 'tourism', 'he'], industries: ['Hospitality', 'Tourism', 'Food & Beverage'] },
    ];

    const empByProfile = groupBy(employment || [], 'profile_id');
    const alignmentStats: Record<string, { total: number; aligned: number }> = {};

    (education || []).forEach((e: any) => {
      if (!e.program) return;
      const prog = e.program.trim();
      if (!alignmentStats[prog]) alignmentStats[prog] = { total: 0, aligned: 0 };
      alignmentStats[prog].total++;

      const empRecords = empByProfile[e.profile_id] || [];
      const progLower = prog.toLowerCase();

      const relevantEntry = INDUSTRY_KEYWORDS.find((entry) => entry.keywords.some((kw) => progLower.includes(kw)));

      const isAligned = empRecords.some((emp: any) => {
        const ind = (emp.company_industry || '').toLowerCase();
        const pos = (emp.position || '').toLowerCase();
        if (!relevantEntry) return false;
        return relevantEntry.industries.some((target) => {
          const t = target.toLowerCase();
          return ind.includes(t) || pos.includes(t);
        });
      });

      if (isAligned) alignmentStats[prog].aligned++;
    });

    const rows = Object.entries(alignmentStats).map(([program, s]) => ({
      'Academic Program': program,
      'Total Graduates Tracked': s.total,
      'Job-Aligned Count': s.aligned,
      'Curriculum Alignment Rate (%)': s.total > 0 ? `${Math.round((s.aligned / s.total) * 100)}%` : '0%',
      'Relevance Status': s.total > 0 && s.aligned / s.total >= 0.7 ? 'High Alignment' : 'Moderate Alignment',
    }));

    await recordReportExport(req, {
      reportName: 'Degree-to-Job Alignment Report',
      reportType: 'degree_alignment',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=degree-alignment-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/employer - Employer & Industry Partner Directory
// -----------------------------------------------------------------------------
router.get('/employer', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const [{ data: companies }, { data: jobs }, { data: employment }] = await Promise.all([
      supabase.from('companies').select('*').order('name', { ascending: true }),
      supabase.from('job_postings').select('company_name'),
      supabase.from('employment').select('company_name').eq('is_current', true),
    ]);

    const jobCounts: Record<string, number> = {};
    (jobs || []).forEach((j: any) => {
      const c = (j.company_name || '').trim().toLowerCase();
      if (c) jobCounts[c] = (jobCounts[c] || 0) + 1;
    });

    const alumniHiredCounts: Record<string, number> = {};
    (employment || []).forEach((e: any) => {
      const c = (e.company_name || '').trim().toLowerCase();
      if (c) alumniHiredCounts[c] = (alumniHiredCounts[c] || 0) + 1;
    });

    const rows = (companies || []).map((c: any) => {
      const nameKey = (c.name || '').trim().toLowerCase();
      return {
        'Company Name': c.name,
        'Industry': c.industry || 'General',
        'Website': c.website || 'N/A',
        'City': c.city || '',
        'Province': c.province || '',
        'Country': c.country || 'Philippines',
        'Contact Email': c.contact_email || '',
        'Contact Phone': c.contact_phone || '',
        'Verification Status': c.is_verified ? 'Verified Partner' : 'Pending Verification',
        'Active Job Openings': jobCounts[nameKey] || 0,
        'Alumni Currently Employed': alumniHiredCounts[nameKey] || 0,
        'Partnership Registered': c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
      };
    });

    await recordReportExport(req, {
      reportName: 'Employer Directory Report',
      reportType: 'employer_directory',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=employer-directory.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows, raw: companies });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/surveys - Tracer Study Surveys List
// -----------------------------------------------------------------------------
router.get('/surveys', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const [{ data: surveys }, { data: responses }, { data: users }] = await Promise.all([
      supabase.from('surveys').select('*').order('created_at', { ascending: false }),
      supabase.from('survey_responses').select('survey_id'),
      supabase.from('users').select('id').eq('role', 'alumni'),
    ]);

    const totalAlumniTarget = users?.length || 1;
    const responseCounts: Record<string, number> = {};
    (responses || []).forEach((r: any) => {
      responseCounts[r.survey_id] = (responseCounts[r.survey_id] || 0) + 1;
    });

    const rows = (surveys || []).map((s: any) => {
      const resp = responseCounts[s.id] || 0;
      return {
        'Survey ID': s.id,
        'Survey Title': s.title,
        'Target Groups': Array.isArray(s.target_groups) ? s.target_groups.join(', ') : '',
        'Active Status': s.is_active ? 'Active' : 'Closed',
        'Total Responses': resp,
        'Target Alumni': totalAlumniTarget,
        'Completion Rate (%)': `${Math.round((resp / totalAlumniTarget) * 100)}%`,
        'Created Date': s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
      };
    });

    await recordReportExport(req, {
      reportName: 'Tracer Survey Summary Report',
      reportType: 'survey_summary',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=survey-summary-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows, raw: surveys });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/survey/:id - Detailed Responses for a Single Survey
// -----------------------------------------------------------------------------
router.get('/survey/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const surveyId = req.params.id;

    const [{ data: survey }, { data: responsesData }] = await Promise.all([
      supabase.from('surveys').select('*').eq('id', surveyId).single(),
      supabase.from('survey_responses').select('*').eq('survey_id', surveyId).order('submitted_at', { ascending: false }),
    ]);

    if (!survey) throw new AppError('Survey not found', 404);

    let responses = responsesData || [];
    const userIds = responses.map((r: any) => r.user_id).filter(Boolean);

    if (userIds.length > 0) {
      const [{ data: users }, { data: profiles }] = await Promise.all([
        supabase.from('users').select('id, email').in('id', userIds),
        supabase.from('profiles').select('user_id, first_name, last_name, id_number').in('user_id', userIds),
      ]);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      responses = responses.map((r: any) => ({
        ...r,
        user: userMap.get(r.user_id) || { email: null },
        profile: profileMap.get(r.user_id) || null,
      }));
    }

    const rows = responses.map((r: any) => {
      const respObj = typeof r.responses === 'object' && r.responses !== null ? r.responses : {};
      const answerSummary = Object.entries(respObj)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' | ');

      return {
        'Survey Title': survey.title,
        'Respondent Name': `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.trim() || 'Anonymous',
        'Respondent Email': r.user?.email || 'N/A',
        'Student ID': r.profile?.id_number || 'N/A',
        'Submission Timestamp': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '',
        'Survey Answers': answerSummary,
      };
    });

    await recordReportExport(req, {
      reportName: `Tracer Survey Details: ${survey.title}`,
      reportType: 'survey_responses',
      format,
      recordCount: rows.length,
      filters: { surveyId },
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=survey-${surveyId.slice(0, 8)}-responses.csv`);
      return res.send(buildCsv(rows));
    }

    res.json({ survey, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/skills - Graduate Skills & Competencies Inventory
// -----------------------------------------------------------------------------
router.get('/skills', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const { data: skillsData } = await supabase
      .from('skills')
      .select('name, category, proficiency_level, is_verified, profile_id');

    const skillCounts: Record<string, { count: number; verifiedCount: number; category: string; avgProficiency: number[] }> = {};

    (skillsData || []).forEach((s: any) => {
      const name = (s.name || '').trim();
      if (!name) return;
      if (!skillCounts[name]) {
        skillCounts[name] = { count: 0, verifiedCount: 0, category: s.category || 'General', avgProficiency: [] };
      }
      skillCounts[name].count++;
      if (s.is_verified) skillCounts[name].verifiedCount++;
      if (s.proficiency_level) skillCounts[name].avgProficiency.push(Number(s.proficiency_level));
    });

    const rows = Object.entries(skillCounts)
      .map(([name, s]) => {
        const avg = s.avgProficiency.length > 0
          ? (s.avgProficiency.reduce((a, b) => a + b, 0) / s.avgProficiency.length).toFixed(1)
          : 'N/A';
        return {
          'Skill Name': name,
          'Category': s.category,
          'Alumni Count': s.count,
          'Verified Skills Count': s.verifiedCount,
          'Average Proficiency (1-5)': avg,
        };
      })
      .sort((a, b) => b['Alumni Count'] - a['Alumni Count']);

    await recordReportExport(req, {
      reportName: 'Graduate Skills Inventory Report',
      reportType: 'skills_report',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=skills-inventory-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/jobs - Job Market & Vacancies Report
// -----------------------------------------------------------------------------
router.get('/jobs', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const [{ data: jobs }, { data: apps }] = await Promise.all([
      supabase.from('job_postings').select('*').order('created_at', { ascending: false }),
      supabase.from('job_applications').select('job_id, status'),
    ]);

    const appCounts: Record<string, { total: number; accepted: number; pending: number }> = {};
    (apps || []).forEach((a: any) => {
      if (!appCounts[a.job_id]) appCounts[a.job_id] = { total: 0, accepted: 0, pending: 0 };
      appCounts[a.job_id].total++;
      if (a.status === 'accepted') appCounts[a.job_id].accepted++;
      if (a.status === 'pending') appCounts[a.job_id].pending++;
    });

    const rows = (jobs || []).map((j: any) => {
      const a = appCounts[j.id] || { total: 0, accepted: 0, pending: 0 };
      return {
        'Position Title': j.position,
        'Company Name': j.company_name,
        'Location': j.location,
        'Job Type': j.job_type,
        'Salary Range': j.salary_range || 'Undisclosed',
        'Alumni Exclusive': j.is_alumni_exclusive ? 'Yes' : 'No',
        'Total Applicants': a.total,
        'Pending Review': a.pending,
        'Accepted Hires': a.accepted,
        'Expiration Date': j.expires_at ? new Date(j.expires_at).toLocaleDateString() : '',
        'Date Posted': j.created_at ? new Date(j.created_at).toLocaleDateString() : '',
      };
    });

    await recordReportExport(req, {
      reportName: 'Job Market Opportunities Report',
      reportType: 'jobs_report',
      format,
      recordCount: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=jobs-opportunities-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: rows, raw: jobs });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/system-master - Full Institutional Master Dataset
// -----------------------------------------------------------------------------
router.get('/system-master', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';

    const [
      { data: users },
      { data: profiles },
      { data: education },
      { data: employment },
      { data: companies },
      { data: surveys },
      { data: jobs },
    ] = await Promise.all([
      supabase.from('users').select('id, email, role, is_verified, is_active, created_at'),
      supabase.from('profiles').select('*'),
      supabase.from('education').select('*'),
      supabase.from('employment').select('*'),
      supabase.from('companies').select('*'),
      supabase.from('surveys').select('*'),
      supabase.from('job_postings').select('*'),
    ]);

    const result = {
      institutionalMetadata: {
        institution: 'Cebu Technological University - Naga Campus',
        system: 'CTU-Naga Alumni Connect',
        compliance: 'Republic Act No. 10173 (Data Privacy Act of 2012)',
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.email || 'Administrator',
      },
      alumniUsers: users || [],
      profiles: profiles || [],
      education: education || [],
      employment: employment || [],
      companies: companies || [],
      surveys: surveys || [],
      jobPostings: jobs || [],
    };

    const totalCount =
      (users?.length || 0) +
      (profiles?.length || 0) +
      (education?.length || 0) +
      (employment?.length || 0);

    await recordReportExport(req, {
      reportName: 'Full Institutional System Master Export',
      reportType: 'system_master_export',
      format,
      recordCount: totalCount,
    });

    if (format === 'csv') {
      // Create a flat summary table for CSV
      const rows = (users || []).map((u: any) => {
        const prof = (profiles || []).find((p: any) => p.user_id === u.id) || {};
        const edu = (education || []).find((e: any) => e.profile_id === prof.id) || {};
        const emp = (employment || []).find((e: any) => e.profile_id === prof.id && e.is_current) || {};
        return {
          'User ID': u.id,
          'Email': u.email,
          'Name': `${prof.first_name || ''} ${prof.last_name || ''}`.trim(),
          'ID Number': prof.id_number || '',
          'Program': edu.program || '',
          'Batch': edu.year_graduated || '',
          'Employment Status': emp.employment_status || prof.employment_status || 'N/A',
          'Company': emp.company_name || '',
          'Position': emp.position || '',
          'Registered At': u.created_at || '',
        };
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=system-master-export.csv');
      return res.send(buildCsv(rows));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
