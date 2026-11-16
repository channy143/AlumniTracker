import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { logAudit } from '../../services/auditLogger';
import { buildDpaCsv, sortRowsAlphabetically } from '../../utils/csvExport';
import { formatProgramLongName } from '../../utils/formatProgram';
import { normalizePhPhone } from '../../utils/formatLocation';
import { validateJobTitle, validateCompanyName, normalizeIndustry, normalizeSalaryRange, toTitleCaseName } from '../../utils/validateJobTitle';

function isCurrentByEndDate(emp: any): boolean {
  if (!emp) return false;
  const end = emp.end_date ? String(emp.end_date).trim() : '';
  return !end || end.toLowerCase() === 'present';
}

const REPORT_PLACEHOLDER_TERMS = new Set([
  'position',
  'current position',
  'organization',
  'company',
  'imong mama',
  'n/a',
  'na',
  'none',
  'null',
  'test',
  'sample',
]);

function isReportValidEmployment(emp: any): boolean {
  if (!emp) return false;
  const pos = String(emp.position || '').trim();
  const comp = String(emp.company_name || '').trim();
  if (pos.length < 2 || comp.length < 2) return false;
  if (REPORT_PLACEHOLDER_TERMS.has(pos.toLowerCase()) || REPORT_PLACEHOLDER_TERMS.has(comp.toLowerCase())) {
    return false;
  }
  return true;
}

const router = Router();

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return (arr || []).reduce((acc: Record<string, T[]>, item: T) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

const buildCsv = buildDpaCsv;

function matchesProgramFilter(rawProgram: string | null | undefined, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  const raw = (rawProgram || '').toLowerCase();
  const long = formatProgramLongName(rawProgram).toLowerCase();
  const filterLong = formatProgramLongName(filter).toLowerCase();
  return raw.includes(f) || long.includes(f) || (!!filterLong && long.includes(filterLong));
}

function normalizeReportEmploymentStatus(
  raw?: string | null,
  options?: { hasValidEmployment?: boolean; isStudent?: boolean; surveyCompleted?: boolean }
): string {
  if (options?.hasValidEmployment) {
    const trimmed = String(raw || '').trim();
    if (trimmed && ['employed', 'self-employed'].includes(trimmed.toLowerCase())) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }
    return 'Employed';
  }
  if (options?.isStudent) {
    return 'Student';
  }
  const trimmed = String(raw || '').trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || ['n/a', 'na', 'none', 'unknown', 'not specified', 'null'].includes(lower)) {
    return 'Not reported';
  }
  // If marked Employed / Self-employed without any valid employment record, treat as Not reported
  if (lower === 'employed' || lower === 'self-employed') {
    return 'Not reported';
  }
  // If user has never completed the survey and status is the legacy 'Unemployed' default, show 'Not reported'
  if (options?.surveyCompleted === false && lower === 'unemployed') {
    return 'Not reported';
  }
  return trimmed;
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
      profilesRes,
    ] = await Promise.all([
      supabase.from('users').select('id, is_archived').eq('role', 'alumni'),
      supabase.from('employment').select('profile_id, employment_status, is_current'),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('surveys').select('id', { count: 'exact', head: true }),
      supabase.from('survey_responses').select('id', { count: 'exact', head: true }),
      supabase.from('job_postings').select('id', { count: 'exact', head: true }),
      supabase.from('skills').select('name'),
      supabase.from('report_exports').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, user_id, employment_status'),
    ]);

    const activeAlumniUsers = (usersRes.data || []).filter((u: any) => !u.is_archived);
    const activeUserIds = new Set(activeAlumniUsers.map((u: any) => u.id));
    const profileByUserId = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

    const empStatusMap = new Map<string, string>();
    (empRes.data || []).forEach((e: any) => {
      if (e.is_current) empStatusMap.set(e.profile_id, e.employment_status);
    });

    let employed = 0;
    let selfEmployed = 0;
    let unemployed = 0;

    activeAlumniUsers.forEach((u: any) => {
      const p = profileByUserId.get(u.id);
      const raw = p?.employment_status || (p ? empStatusMap.get(p.id) : '') || '';
      const lower = String(raw).toLowerCase().trim();
      if (lower === 'employed') employed++;
      else if (['self-employed', 'entrepreneur', 'freelance'].includes(lower)) selfEmployed++;
      else unemployed++;
    });

    const uniqueSkills = new Set((skillsRes.data || []).map((s: any) => (s.name || '').trim().toLowerCase()).filter(Boolean));

    res.json({
      totalAlumni: activeUserIds.size,
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
      .select('id, email, role, is_verified, is_active, is_archived, survey_completed, last_login, created_at')
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
    if (statusFilter === 'archived') {
      users = users.filter((u: any) => u.is_archived);
    } else {
      users = users.filter((u: any) => !u.is_archived);
      if (statusFilter === 'verified') users = users.filter((u: any) => u.is_verified);
      if (statusFilter === 'unverified') users = users.filter((u: any) => !u.is_verified);
      if (statusFilter === 'active') users = users.filter((u: any) => u.is_active !== false);
    }
    if (programFilter) {
      users = users.filter((u: any) =>
        (u.education || []).some((e: any) => matchesProgramFilter(e.program, programFilter))
      );
    }
    if (batchFilter) {
      users = users.filter((u: any) =>
        (u.education || []).some((e: any) => String(e.year_graduated) === String(batchFilter))
      );
    }
    const currentYear = new Date().getFullYear();

    if (empStatusFilter) {
      users = users.filter((u: any) => {
        const ed = (u.education || [])[0] || {};
        const isStudent = Boolean(ed.year_graduated && Number(ed.year_graduated) > currentYear);
        const validEmp = (u.employment || []).find(
          (e: any) => isCurrentByEndDate(e) && isReportValidEmployment(e)
        );
        const derivedStatus = normalizeReportEmploymentStatus(
          validEmp?.employment_status || u.profile?.employment_status,
          {
            hasValidEmployment: Boolean(validEmp),
            isStudent,
            surveyCompleted: Boolean(u.survey_completed),
          }
        );
        return derivedStatus.toLowerCase() === empStatusFilter.toLowerCase();
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const rows = users.map((u: any) => {
      const ed = (u.education || [])[0] || {};
      const isStudent = Boolean(ed.year_graduated && Number(ed.year_graduated) > currentYear);
      const validEmp = (u.employment || []).find(
        (e: any) => isCurrentByEndDate(e) && isReportValidEmployment(e)
      );
      const hasValidEmployment = Boolean(validEmp);
      const derivedEmploymentStatus = normalizeReportEmploymentStatus(
        validEmp?.employment_status || u.profile?.employment_status,
        {
          hasValidEmployment,
          isStudent,
          surveyCompleted: Boolean(u.survey_completed),
        }
      );

      const hasLocation = Boolean(u.profile?.city || u.profile?.province);
      const rawCountry = String(u.profile?.country || '').trim();
      const displayCountry = hasLocation
        ? (rawCountry || 'Philippines')
        : (rawCountry && rawCountry.toLowerCase() !== 'philippines' ? rawCountry : '');

      const isEmailValid = emailRegex.test(String(u.email || '').trim());

      return {
        'User ID': u.id,
        'Email Address': u.email,
        'First Name': toTitleCaseName(u.profile?.first_name || ''),
        'Last Name': toTitleCaseName(u.profile?.last_name || ''),
        'ID Number': u.profile?.id_number || '',
        'Degree Program': ed.program ? formatProgramLongName(ed.program) : '',
        'Major': ed.major || '',
        'Graduation Year': ed.year_graduated || '',
        'Graduate Status': isStudent ? 'Student' : (ed.year_graduated ? 'Alumni' : 'Unverified'),
        'Employment Status': derivedEmploymentStatus,
        'Current Position': validEmp ? validEmp.position : '',
        'Current Company': validEmp ? validEmp.company_name : '',
        'Industry': validEmp ? (normalizeIndustry(validEmp.company_industry) || validEmp.company_industry || '') : '',
        'Salary Range': validEmp ? (normalizeSalaryRange(validEmp.salary_range) || '') : '',
        'Phone': u.profile?.phone ? normalizePhPhone(u.profile.phone) : '',
        'City': u.profile?.city || '',
        'Province': u.profile?.province || '',
        'Country': displayCountry,
        'Verified': u.is_verified && isEmailValid ? 'Yes' : 'No',
        'Registered Date': u.created_at
          ? new Date(u.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })
          : '',
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows), raw: users });
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
    const currentYear = new Date().getFullYear();

    // Filter out placeholder/junk rows
    let employment = (employmentData || []).filter((e: any) => isReportValidEmployment(e));

    // Also include any profile that is Employed / Self-employed with a valid position & company on their profile but missing from the employment table
    const { data: employedProfiles } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, id_number, employment_status, current_job_title, company_name, industry, salary_range, updated_at, created_at');

    const empProfileIdsSet = new Set(employment.map((e: any) => e.profile_id));
    (employedProfiles || []).forEach((prof: any) => {
      const statusLower = String(prof.employment_status || '').trim().toLowerCase();
      if ((statusLower === 'employed' || statusLower === 'self-employed') && !empProfileIdsSet.has(prof.id)) {
        const syntheticEmp = {
          id: `profile-${prof.id}`,
          profile_id: prof.id,
          company_name: prof.company_name || (statusLower === 'self-employed' ? 'Self-employed / Independent' : ''),
          company_industry: prof.industry || '',
          position: prof.current_job_title || '',
          employment_status: prof.employment_status,
          job_type: 'full-time',
          salary_range: prof.salary_range || null,
          start_date: prof.updated_at ? String(prof.updated_at).slice(0, 10) : (prof.created_at ? String(prof.created_at).slice(0, 10) : ''),
          end_date: null,
          is_current: true,
        };
        if (isReportValidEmployment(syntheticEmp)) {
          employment.push(syntheticEmp);
          empProfileIdsSet.add(prof.id);
        }
      }
    });

    const profileIds = Array.from(new Set(employment.map((e: any) => e.profile_id).filter(Boolean)));

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

    // Filter out non-graduates (year_graduated > currentYear) and deduplicate (profile_id, company_name, position)
    const seenRoleKeys = new Set<string>();
    employment = employment.filter((e: any) => {
      const gradYear = e.education?.[0]?.year_graduated ? Number(e.education[0].year_graduated) : NaN;
      if (!Number.isFinite(gradYear) || gradYear > currentYear) return false;

      const comp = validateCompanyName(e.company_name).cleaned.toLowerCase();
      const pos = validateJobTitle(e.position).cleaned.toLowerCase();
      const key = `${e.profile_id}::${comp}::${pos}`;
      if (seenRoleKeys.has(key)) return false;
      seenRoleKeys.add(key);
      return true;
    });

    // Ensure at most one current role (EndDate IS NULL) per alumnus (latest start_date stays current, older ones close)
    const byProfile = groupBy(employment, 'profile_id');
    Object.values(byProfile).forEach((list: any[]) => {
      const sortedAsc = [...list].sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')));
      for (let i = 0; i < sortedAsc.length - 1; i++) {
        if (isCurrentByEndDate(sortedAsc[i])) {
          sortedAsc[i].end_date = sortedAsc[i + 1].start_date || sortedAsc[i].start_date || null;
          sortedAsc[i].is_current = false;
        }
      }
      if (sortedAsc.length > 0) {
        const last = sortedAsc[sortedAsc.length - 1];
        if (isCurrentByEndDate(last)) {
          last.end_date = null;
          last.is_current = true;
        }
      }
    });

    if (programFilter) {
      employment = employment.filter((e: any) =>
        (e.education || []).some((ed: any) => matchesProgramFilter(ed.program, programFilter))
      );
    }
    if (batchFilter) {
      employment = employment.filter((e: any) =>
        (e.education || []).some((ed: any) => String(ed.year_graduated) === String(batchFilter))
      );
    }
    if (statusFilter) {
      employment = employment.filter((e: any) => {
        const isCurr = isCurrentByEndDate(e);
        const derivedStatus = isCurr
          ? (String(e.employment_status || '').toLowerCase().includes('self') || String(e.job_type || '').toLowerCase() === 'freelance' ? 'Self-employed' : 'Employed')
          : 'Past Role';
        return derivedStatus.toLowerCase() === statusFilter.toLowerCase();
      });
    }
    if (jobTypeFilter) {
      employment = employment.filter((e: any) => (e.job_type || '').toLowerCase() === jobTypeFilter.toLowerCase());
    }
    if (industryFilter) {
      employment = employment.filter((e: any) => {
        const ind = normalizeIndustry(e.company_industry) || e.company_industry || '';
        return ind.toLowerCase().includes(industryFilter.toLowerCase());
      });
    }

    const rows = employment.map((e: any) => {
      const isCurr = isCurrentByEndDate(e);
      const derivedStatus = isCurr
        ? (String(e.employment_status || '').toLowerCase().includes('self') || String(e.job_type || '').toLowerCase() === 'freelance' ? 'Self-employed' : 'Employed')
        : 'Past Role';
      return {
        'Alumni Name': `${toTitleCaseName(e.profile?.first_name || '')} ${toTitleCaseName(e.profile?.last_name || '')}`.trim(),
        'Email': e.profile?.email || '',
        'ID Number': e.profile?.id_number || '',
        'Degree Program': e.education?.[0]?.program ? formatProgramLongName(e.education[0].program) : '',
        'Graduation Year': e.education?.[0]?.year_graduated || '',
        'Company Name': String(e.company_name || '').trim(),
        'Industry': normalizeIndustry(e.company_industry) || String(e.company_industry || '').trim(),
        'Position / Job Title': String(e.position || '').trim(),
        'Employment Status': derivedStatus,
        'Job Type': e.job_type || '',
        'Current Position': isCurr ? 'Yes' : 'No',
        'Salary Range': normalizeSalaryRange(e.salary_range) || '',
        'Start Date': e.start_date || '',
        'End Date': isCurr ? 'Present' : (e.end_date || ''),
      };
    });

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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows), raw: employment });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/employment-proofs - Alumni Proof of Employment Report
// -----------------------------------------------------------------------------
function formatProofTypeLabel(type?: string | null): string {
  if (!type) return '';
  if (type.startsWith('other:')) return type.replace('other:', '').trim();
  const map: Record<string, string> = {
    coe: 'Certificate of Employment (COE)',
    welcome_email_payslip: 'Payslip / Welcome Email',
    affidavit: 'Sworn Affidavit',
    company_id: 'Company ID',
    contract: 'Employment Contract',
    dti_sec: 'DTI / SEC Registration',
    other: 'Other Proof',
  };
  return map[type] || type.toUpperCase();
}

router.get('/employment-proofs', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const programFilter = req.query.program as string;
    const batchFilter = req.query.batch as string;
    const empStatusFilter = req.query.employment_status as string;
    const verificationFilter = req.query.verification_status as string;

    const { data: usersData, error: uErr } = await supabase
      .from('users')
      .select('id, email, is_verified, is_archived, created_at')
      .eq('role', 'alumni')
      .order('created_at', { ascending: false });

    if (uErr) throw new AppError(uErr.message, 500);
    const activeUsers = (usersData || []).filter((u: any) => !u.is_archived);
    const userIds = activeUsers.map((u: any) => u.id).filter(Boolean);

    let profiles: any[] = [];
    let education: any[] = [];
    let employment: any[] = [];

    if (userIds.length > 0) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, id_number, employment_status')
        .in('user_id', userIds);
      profiles = profData || [];
      const profileIds = profiles.map((p: any) => p.id).filter(Boolean);

      if (profileIds.length > 0) {
        const [edRes, empRes] = await Promise.all([
          supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
          supabase.from('employment').select('*').in('profile_id', profileIds).order('is_current', { ascending: false }).order('start_date', { ascending: false }),
        ]);
        education = edRes.data || [];
        employment = empRes.data || [];
      }
    }

    const profByUser = new Map(profiles.map((p: any) => [p.user_id, p]));
    const eduByProfile = groupBy(education, 'profile_id');
    const empByProfile = groupBy(employment, 'profile_id');

    let records: any[] = [];
    activeUsers.forEach((u: any) => {
      const prof = profByUser.get(u.id);
      const edList = prof ? eduByProfile[prof.id] || [] : [];
      const empList = prof ? empByProfile[prof.id] || [] : [];
      const ed = edList[0] || {};

      if (empList.length === 0) {
        records.push({
          user: u,
          profile: prof || {},
          education: ed,
          employment: null,
        });
      } else {
        empList.forEach((emp: any) => {
          records.push({
            user: u,
            profile: prof || {},
            education: ed,
            employment: emp,
          });
        });
      }
    });

    if (programFilter) {
      records = records.filter((r) =>
        matchesProgramFilter(r.education?.program, programFilter)
      );
    }
    if (batchFilter) {
      records = records.filter((r) =>
        String(r.education?.year_graduated || '') === String(batchFilter)
      );
    }
    if (empStatusFilter) {
      records = records.filter((r) => {
        const st = normalizeReportEmploymentStatus(r.employment?.employment_status || r.profile?.employment_status);
        return st.toLowerCase() === empStatusFilter.toLowerCase();
      });
    }
    if (verificationFilter) {
      records = records.filter((r) => {
        const emp = r.employment;
        const hasProof = Boolean(emp?.proof_url);
        const status = emp?.is_verified
          ? 'verified'
          : emp?.verification_status === 'rejected'
            ? 'rejected'
            : hasProof
              ? 'pending'
              : 'missing';
        return status === verificationFilter.toLowerCase();
      });
    }

    const rows = records.map((r) => {
      const emp = r.employment;
      const hasProof = Boolean(emp?.proof_url);
      const verificationStatus = !emp
        ? 'No Employment Record'
        : emp.is_verified
          ? 'Verified'
          : emp.verification_status === 'rejected'
            ? 'Rejected'
            : hasProof
              ? 'Pending Verification'
              : 'No Proof Submitted';

      return {
        'Alumni Name': `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.trim() || r.user?.email || '',
        'Email': r.user?.email || r.profile?.email || '',
        'ID Number': r.profile?.id_number || '',
        'Degree Program': r.education?.program ? formatProgramLongName(r.education.program) : '',
        'Graduation Year': r.education?.year_graduated || '',
        'Employment Status': normalizeReportEmploymentStatus(emp?.employment_status || r.profile?.employment_status),
        'Company Name': emp?.company_name || '',
        'Position / Job Title': emp?.position || '',
        'Current Position': emp ? (emp.is_current ? 'Yes' : 'No') : '',
        'Proof Document Type': hasProof ? (formatProofTypeLabel(emp?.proof_type) || 'Uploaded Document') : 'None',
        'Proof File URL': emp?.proof_url || '',
        'Verification Status': verificationStatus,
        'Start Date': emp?.start_date || '',
        'Updated At': emp?.updated_at ? new Date(emp.updated_at).toLocaleDateString() : '',
      };
    });

    await recordReportExport(req, {
      reportName: 'Proof of Employment Report',
      reportType: 'employment_proofs',
      format,
      recordCount: rows.length,
      filters: { program: programFilter, batch: batchFilter, employment_status: empStatusFilter, verification_status: verificationFilter },
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=employment-proofs-report.csv');
      return res.send(buildCsv(rows));
    }

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows) });
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
      const titleCheck = validateJobTitle(e.position);
      const companyCheck = validateCompanyName(e.company_name);
      if (!titleCheck.valid || !companyCheck.valid) return;

      const pid = e.profile_id;
      if (!careerPaths[pid]) {
        careerPaths[pid] = {
          profile: profileMap.get(pid) || {},
          education: eduMap.get(pid) || {},
          positions: [],
        };
      }
      const normComp = companyCheck.cleaned.toLowerCase();
      const normPos = titleCheck.cleaned.toLowerCase();
      const existingDup = careerPaths[pid].positions.find(
        (existing: any) =>
          existing.company_name.trim().toLowerCase() === normComp &&
          existing.position.trim().toLowerCase() === normPos
      );
      const normalizedInd = normalizeIndustry(e.company_industry) || e.company_industry || '';
      if (existingDup) {
        // Merge duplicate (same company & position): keep earliest start_date and latest end/current status
        if (e.is_current) {
          existingDup.is_current = true;
          existingDup.end_date = null;
        } else if (!existingDup.is_current && e.end_date && (!existingDup.end_date || e.end_date > existingDup.end_date)) {
          existingDup.end_date = e.end_date;
        }
        if (!existingDup.company_industry && normalizedInd) {
          existingDup.company_industry = normalizedInd;
        }
        return;
      }

      careerPaths[pid].positions.push({
        ...e,
        company_name: companyCheck.cleaned,
        position: titleCheck.cleaned,
        company_industry: normalizedInd,
      });
    });

    const rows = Object.values(careerPaths).flatMap((cp: any) => {
      const posList = cp.positions || [];
      // Close older positions that had no end_date when a newer position exists
      for (let i = 0; i < posList.length - 1; i++) {
        if (isCurrentByEndDate(posList[i])) {
          posList[i].end_date = posList[i + 1].start_date || posList[i].start_date || '';
          posList[i].is_current = false;
        }
      }
      if (posList.length > 0 && isCurrentByEndDate(posList[posList.length - 1])) {
        posList[posList.length - 1].end_date = null;
        posList[posList.length - 1].is_current = true;
      }

      const firstPos = posList[0] || {};
      const progressionChain =
        posList.length > 1
          ? posList.map((item: any) => `${item.position} (${item.company_name})`).join(' → ')
          : `Initial Role: ${firstPos.position} (${firstPos.company_name})`;

      return posList.map((p: any, idx: number) => ({
        'Alumni Name': `${toTitleCaseName(cp.profile?.first_name || '')} ${toTitleCaseName(cp.profile?.last_name || '')}`.trim(),
        'Email': cp.profile?.email || '',
        'Degree Program': cp.education?.program ? formatProgramLongName(cp.education.program) : '',
        'Graduation Year': cp.education?.year_graduated || '',
        'Position Order': idx + 1,
        'Company': p.company_name,
        'Position': p.position,
        'Industry': p.company_industry || '',
        'Job Type': p.job_type || '',
        'Start Date': p.start_date || '',
        'End Date': isCurrentByEndDate(p) ? 'Present' : (p.end_date || ''),
        'Total Positions Tracked': posList.length,
        'Progression Summary': progressionChain,
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows) });
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
      data: sortRowsAlphabetically(rows),
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

    const [{ data: education }, { data: profiles }, { data: employment }] = await Promise.all([
      supabase.from('education').select('profile_id, program, year_graduated'),
      supabase.from('profiles').select('id, employment_status'),
      supabase.from('employment').select('profile_id, employment_status, is_current').eq('is_current', true),
    ]);

    const empStatusMap = new Map<string, string>();
    (employment || []).forEach((e: any) => {
      empStatusMap.set(e.profile_id, (e.employment_status || '').toLowerCase());
    });
    const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const courseStats: Record<string, { total: number; employed: number; selfEmployed: number; unemployed: number }> = {};

    (education || []).forEach((e: any) => {
      if (!e.program) return;
      if (yearFilter && String(e.year_graduated) !== String(yearFilter)) return;

      const prog = formatProgramLongName(e.program);
      if (!prog) return;
      if (!courseStats[prog]) courseStats[prog] = { total: 0, employed: 0, selfEmployed: 0, unemployed: 0 };
      courseStats[prog].total++;

      const p = profMap.get(e.profile_id);
      const raw = p?.employment_status || empStatusMap.get(e.profile_id) || '';
      const status = String(raw).toLowerCase().trim();

      if (status === 'employed') courseStats[prog].employed++;
      else if (status === 'self-employed' || status === 'entrepreneur' || status === 'freelance') courseStats[prog].selfEmployed++;
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows) });
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

    const [{ data: education }, { data: profiles }, { data: employment }] = await Promise.all([
      supabase.from('education').select('profile_id, year_graduated'),
      supabase.from('profiles').select('id, employment_status'),
      supabase.from('employment').select('profile_id, is_current, employment_status').eq('is_current', true),
    ]);

    const empMap = new Map<string, string>();
    (employment || []).forEach((e: any) => {
      empMap.set(e.profile_id, (e.employment_status || '').toLowerCase());
    });
    const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const batchStats: Record<string, { total: number; employed: number; unemployed: number }> = {};

    (education || []).forEach((e: any) => {
      if (!e.year_graduated) return;
      const batch = String(e.year_graduated);
      if (!batchStats[batch]) batchStats[batch] = { total: 0, employed: 0, unemployed: 0 };
      batchStats[batch].total++;

      const p = profMap.get(e.profile_id);
      const raw = p?.employment_status || empMap.get(e.profile_id) || '';
      const st = String(raw).toLowerCase().trim();

      if (st === 'employed' || st === 'self-employed' || st === 'entrepreneur' || st === 'freelance') {
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows) });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/admin/reports/degree-alignment - Curriculum & Degree Alignment
// -----------------------------------------------------------------------------
function containsWord(text: string, term: string): boolean {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

router.get('/degree-alignment', async (req: AuthenticatedRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const currentYear = new Date().getFullYear();

    const [{ data: education }, { data: employment }, { data: profiles }, { data: users }] = await Promise.all([
      supabase.from('education').select('profile_id, program, major, year_graduated'),
      supabase.from('employment').select('profile_id, company_name, company_industry, position, end_date, is_current'),
      supabase.from('profiles').select('id, user_id, employment_status'),
      supabase.from('users').select('id, survey_completed').eq('role', 'alumni'),
    ]);

    const surveyCompletedByUserId = new Map((users || []).map((u: any) => [u.id, Boolean(u.survey_completed)]));
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

    const INDUSTRY_KEYWORDS = [
      { keywords: ['ict', 'information and communications technology', 'information technology', 'computer', 'software', 'it', 'data', 'developer', 'programmer', 'bsit'], industries: ['Information Technology', 'IT', 'Software', 'Computer', 'Developer', 'Engineer', 'Education', 'Teacher', 'Instructor'] },
      { keywords: ['home economics', 'hospitality', 'hotel', 'restaurant', 'food', 'tourism', 'bshm'], industries: ['Hospitality', 'Tourism', 'Food & Beverage', 'Education', 'Teacher', 'Instructor'] },
      { keywords: ['industrial arts', 'industrial technology', 'engineering', 'industrial', 'manufacturing', 'bit'], industries: ['Information Technology', 'Technology', 'Industrial', 'Engineering', 'Manufacturing', 'Education', 'Teacher', 'Instructor'] },
      { keywords: ['accounting', 'business', 'finance', 'management', 'commerce', 'bsba'], industries: ['Accounting', 'Business', 'Finance', 'BPO'] },
      { keywords: ['education', 'teaching', 'school', 'training', 'academic', 'beed', 'bsed', 'btled'], industries: ['Education', 'Academic', 'School', 'Teacher', 'Instructor', 'Professor'] },
    ];

    const validCurrentEmployment = (employment || []).filter(
      (emp: any) => isCurrentByEndDate(emp) && isReportValidEmployment(emp)
    );
    const empByProfile = groupBy(validCurrentEmployment, 'profile_id');

    // Deduplicate (profile_id, program) and strictly require graduation year <= currentYear
    const seenGraduateKeys = new Set<string>();
    const alignmentStats: Record<string, { total: number; responded: number; employed: number; aligned: number }> = {};

    (education || []).forEach((e: any) => {
      if (!e.program) return;
      const gradYear = e.year_graduated ? Number(e.year_graduated) : NaN;
      if (!Number.isFinite(gradYear) || gradYear > currentYear) return;

      const prog = formatProgramLongName(e.program);
      if (!prog) return;

      const dedupKey = `${e.profile_id}::${prog.toLowerCase()}`;
      if (seenGraduateKeys.has(dedupKey)) return;
      seenGraduateKeys.add(dedupKey);

      if (!alignmentStats[prog]) alignmentStats[prog] = { total: 0, responded: 0, employed: 0, aligned: 0 };
      alignmentStats[prog].total++;

      const empRecords = empByProfile[e.profile_id] || [];
      const prof = profileById.get(e.profile_id);
      const hasSurveyResponse = prof ? Boolean(surveyCompletedByUserId.get(prof.user_id)) : false;
      const hasReportedStatus = Boolean(
        empRecords.length > 0 || (hasSurveyResponse && prof?.employment_status && String(prof.employment_status).trim())
      );
      if (hasReportedStatus) {
        alignmentStats[prog].responded++;
      }

      if (empRecords.length === 0) return;

      alignmentStats[prog].employed++;

      const programAndMajor = e.major ? `${e.major} ${prog}` : prog;
      const relevantEntry = INDUSTRY_KEYWORDS.find((entry) =>
        entry.keywords.some((kw) => containsWord(programAndMajor, kw))
      );

      const isAligned = Boolean(
        relevantEntry &&
          empRecords.some((emp: any) => {
            const ind = normalizeIndustry(emp.company_industry) || emp.company_industry || '';
            const pos = emp.position || '';
            return relevantEntry.industries.some((target) => containsWord(ind, target) || containsWord(pos, target));
          })
      );

      if (isAligned) alignmentStats[prog].aligned++;
    });

    const rows = Object.entries(alignmentStats).map(([program, s]) => {
      const responseRate = s.total > 0 ? Math.round((s.responded / s.total) * 100) : 0;
      const rate = s.employed > 0 ? Math.round((s.aligned / s.employed) * 100) : null;
      const status =
        rate === null
          ? 'No Employment Data'
          : rate >= 70
            ? 'High Alignment'
            : rate >= 40
              ? 'Moderate Alignment'
              : rate > 0
                ? 'Low Alignment'
                : 'Not Aligned';

      return {
        'Academic Program': program,
        'Total Graduates Tracked': s.total,
        'Respondents': s.responded,
        'Response Rate (%)': `${responseRate}%`,
        'Employed Count': s.employed,
        'Job-Aligned Count': s.aligned,
        'Curriculum Alignment Rate (%)': rate !== null ? `${rate}%` : 'N/A',
        'Relevance Status': status,
      };
    });

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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows) });
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows), raw: companies });
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

    const [{ data: surveys }, { data: responses }, { data: users }, { data: profiles }, { data: education }] = await Promise.all([
      supabase.from('surveys').select('*').order('created_at', { ascending: false }),
      supabase.from('survey_responses').select('survey_id, user_id'),
      supabase.from('users').select('id').eq('role', 'alumni'),
      supabase.from('profiles').select('id, user_id'),
      supabase.from('education').select('profile_id, program, year_graduated'),
    ]);

    const profileIdByUserId = new Map((profiles || []).map((p: any) => [p.user_id, p.id]));
    const eduByProfileId = groupBy(education || [], 'profile_id');

    const alumniMeta = (users || []).map((u: any) => {
      const pid = profileIdByUserId.get(u.id);
      const edus = pid ? eduByProfileId[pid] || [] : [];
      return {
        userId: u.id,
        programs: edus.map((e: any) => ({
          raw: String(e.program || '').trim().toLowerCase(),
          long: e.program ? formatProgramLongName(e.program).toLowerCase() : '',
          year: e.year_graduated ? String(e.year_graduated) : '',
        })),
      };
    });

    const distinctRespondentsBySurvey: Record<string, Set<string>> = {};
    (responses || []).forEach((r: any) => {
      if (!r.survey_id || !r.user_id) return;
      if (!distinctRespondentsBySurvey[r.survey_id]) {
        distinctRespondentsBySurvey[r.survey_id] = new Set();
      }
      distinctRespondentsBySurvey[r.survey_id].add(String(r.user_id));
    });

    const rows = (surveys || []).map((s: any) => {
      const targetGroups: string[] = Array.isArray(s.target_groups)
        ? s.target_groups.map((g: any) => String(g).trim()).filter(Boolean)
        : [];
      const isAllAlumni =
        targetGroups.length === 0 ||
        targetGroups.some((g) => g.toLowerCase() === 'all' || g.toLowerCase() === 'all alumni');

      const targetAlumniCount = isAllAlumni
        ? alumniMeta.length
        : alumniMeta.filter((a: any) =>
            a.programs.some((p: any) =>
              targetGroups.some((g) => {
                const gl = g.toLowerCase();
                return (
                  (p.raw && (p.raw === gl || containsWord(p.long, gl))) ||
                  (p.year && (gl === p.year || gl === `batch ${p.year}`))
                );
              })
            )
          ).length;

      const resp = distinctRespondentsBySurvey[s.id]?.size || 0;
      const completionRate =
        targetAlumniCount > 0 ? `${Math.min(100, Math.round((resp / targetAlumniCount) * 100))}%` : 'N/A';

      return {
        'Survey ID': s.id,
        'Survey Title': s.title,
        'Target Groups': targetGroups.join(', '),
        'Active Status': s.is_active ? 'Active' : 'Closed',
        'Total Responses': resp,
        'Target Alumni': targetAlumniCount,
        'Completion Rate (%)': completionRate,
        'Created Date': s.created_at
          ? new Date(s.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })
          : '',
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

    // Build ordered, human-readable columns from survey.questions + any extra response keys
    // Exclude redundant identity keys already represented by Respondent Name / Email / Student ID
    const REDUNDANT_IDENTITY_KEYS = new Set([
      'full_name', 'fullname', 'name',
      'first_name', 'firstname',
      'middle_name', 'middlename',
      'last_name', 'lastname',
      'email', 'email_address', 'emailaddress',
      'student_id', 'studentid', 'id_number', 'idnumber',
    ]);
    const questionLabelMap = new Map<string, string>();
    const orderedKeys: string[] = [];
    const seenKeys = new Set<string>();

    if (Array.isArray(survey.questions)) {
      survey.questions.forEach((q: any) => {
        if (!q || !q.id || q.type === 'section') return;
        const key = String(q.id);
        if (REDUNDANT_IDENTITY_KEYS.has(key.toLowerCase())) return;
        if (q.label) questionLabelMap.set(key, String(q.label));
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          orderedKeys.push(key);
        }
      });
    }

    responses.forEach((r: any) => {
      const respObj = typeof r.responses === 'object' && r.responses !== null ? r.responses : {};
      Object.keys(respObj).forEach((k) => {
        if (REDUNDANT_IDENTITY_KEYS.has(k.toLowerCase())) return;
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          orderedKeys.push(k);
        }
      });
    });

    const formatColumnLabel = (key: string): string => {
      if (questionLabelMap.has(key)) return questionLabelMap.get(key)!;
      return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    };

    const formatAnswerValue = (key: string, val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (Array.isArray(val)) return val.map((item) => formatAnswerValue(key, item)).filter(Boolean).join('; ');
      if (typeof val === 'object') {
        if ('agreed' in val) return val.agreed ? 'Agreed' : 'Declined';
        return Object.entries(val)
          .map(([subK, subV]) => `${formatColumnLabel(subK)}: ${formatAnswerValue(subK, subV)}`)
          .join('; ');
      }
      const str = String(val).trim();
      if (!str) return '';
      if (/^(program|degree|course|degree_program|program_graduated)$/i.test(key)) {
        return formatProgramLongName(str);
      }
      return str;
    };

    // Ensure unique column headers in case two keys share a label
    const keyToHeader = new Map<string, string>();
    const usedHeaders = new Set<string>([
      'Survey Title',
      'Respondent Name',
      'Respondent Email',
      'Student ID',
      'Submission Timestamp',
    ]);
    orderedKeys.forEach((k) => {
      let header = formatColumnLabel(k);
      if (usedHeaders.has(header)) {
        let suffix = 2;
        while (usedHeaders.has(`${header} (${suffix})`)) suffix++;
        header = `${header} (${suffix})`;
      }
      usedHeaders.add(header);
      keyToHeader.set(k, header);
    });

    const rows = responses.map((r: any) => {
      const respObj = typeof r.responses === 'object' && r.responses !== null ? r.responses : {};
      const profileName = `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.trim();
      const respFullName =
        respObj.full_name ||
        respObj.fullName ||
        [
          respObj.firstName || respObj.first_name,
          respObj.middleName || respObj.middle_name,
          respObj.lastName || respObj.last_name,
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

      const row: Record<string, any> = {
        'Survey Title': survey.title,
        'Respondent Name': profileName || respFullName || 'Anonymous',
        'Respondent Email': r.user?.email || respObj.email || respObj.emailAddress || 'N/A',
        'Student ID': r.profile?.id_number || respObj.studentId || respObj.student_id || respObj.idNumber || 'N/A',
        'Submission Timestamp': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '',
      };

      orderedKeys.forEach((k) => {
        const header = keyToHeader.get(k)!;
        row[header] = formatAnswerValue(k, respObj[k]);
      });

      return row;
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

    res.json({ survey, count: rows.length, data: sortRowsAlphabetically(rows) });
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

    const skillCounts: Record<string, { displayName: string; count: number; verifiedCount: number; category: string; avgProficiency: number[] }> = {};

    (skillsData || []).forEach((s: any) => {
      const name = (s.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!skillCounts[key]) {
        skillCounts[key] = { displayName: name, count: 0, verifiedCount: 0, category: s.category || 'General', avgProficiency: [] };
      } else if (skillCounts[key].displayName === skillCounts[key].displayName.toLowerCase() && name !== name.toLowerCase()) {
        // Prefer mixed/capitalized casing for display when available
        skillCounts[key].displayName = name;
      }
      skillCounts[key].count++;
      if (s.is_verified) skillCounts[key].verifiedCount++;
      if (s.proficiency_level) skillCounts[key].avgProficiency.push(Number(s.proficiency_level));
    });

    const rows = Object.values(skillCounts)
      .map((s) => {
        const avg = s.avgProficiency.length > 0
          ? (s.avgProficiency.reduce((a, b) => a + b, 0) / s.avgProficiency.length).toFixed(1)
          : 'N/A';
        return {
          'Skill Name': s.displayName,
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows) });
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

    res.json({ count: rows.length, data: sortRowsAlphabetically(rows), raw: jobs });
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
          'Program': edu.program ? formatProgramLongName(edu.program) : '',
          'Batch': edu.year_graduated || '',
          'Employment Status': normalizeReportEmploymentStatus(emp.employment_status || prof.employment_status),
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
