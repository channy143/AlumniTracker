import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

function abbreviateProgram(name: string): string {
  const s = String(name || '').trim();
  if (!s) return s;
  if (/^[A-Z][A-Z0-9.\-]{1,8}$/.test(s)) return s;
  const stopwords = new Set(['of', 'in', 'and', 'the', 'a', 'an', 'for', 'with', 'at', 'on']);
  const words = s.split(/\s+/).filter((w) => w && !stopwords.has(w.toLowerCase()));
  const abbr = words.map((w) => (w.toLowerCase() === 'education' ? 'ED' : w[0])).join('').toUpperCase();
  return abbr && abbr.length >= 2 ? abbr : s;
}

function normalize(s: string): string {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const router = Router();

let partnershipSupported: boolean | null = null;

async function hasPartnershipColumn(): Promise<boolean> {
  if (partnershipSupported !== null) return partnershipSupported;
  const { error } = await supabase.from('companies').select('id, partnership_status').limit(1);
  partnershipSupported = !error;
  return partnershipSupported;
}

async function safeCompanies(): Promise<any[]> {
  try {
    const supported = await hasPartnershipColumn();
    const select = supported
      ? 'id, name, industry, city, province, website, description, partnership_status, is_active'
      : 'id, name, industry, city, province, website, description, is_active';
    const { data, error } = await supabase.from('companies').select(select);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

function toRanked(obj: Record<string, number>) {
  return Object.entries(obj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function topKey(counts: Record<string, number>): string | null {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function matchesEmploymentType(jobType: string, filter: string): boolean {
  const t = String(jobType || '').toLowerCase();
  if (filter === 'Full-time' && t === 'full-time') return true;
  if (filter === 'Part-time' && t === 'part-time') return true;
  if (filter === 'Contractual' && (t === 'contract' || t === 'contractual')) return true;
  if (filter === 'Freelance' && t === 'freelance') return true;
  if (filter === 'Internship' && t === 'internship') return true;
  return false;
}

router.get('/statistics', async (req, res, next) => {
  try {
    const academicYear = req.query.academic_year as string;
    const batch = req.query.batch as string;
    const course = req.query.course as string;
    const industryFilter = req.query.industry as string;
    const companyFilter = req.query.company as string;
    const typeFilter = req.query.employment_type as string;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');
    const alumniUsers = users || [];
    const alumniUserIds = alumniUsers.map((u: any) => u.id);

    let profiles: any[] = [];
    if (alumniUserIds.length > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, city, province, company_name, industry')
        .in('user_id', alumniUserIds);
      profiles = p || [];
    }

    const profileIds = profiles.map((p: any) => p.id);
    let education: any[] = [];
    let employment: any[] = [];
    if (profileIds.length > 0) {
      const [{ data: e }, { data: emp }] = await Promise.all([
        supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
        supabase.from('employment').select('profile_id, company_name, position, company_industry, job_type, start_date, end_date, is_current, updated_at').in('profile_id', profileIds),
      ]);
      education = e || [];
      employment = emp || [];
    }

    const { data: surveys } = await supabase.from('surveys').select('id, academic_year, status, is_active');
    const { data: surveyResponses } = await supabase
      .from('survey_responses')
      .select('survey_id, user_id');

    const profileByUser = new Map(profiles.map((p: any) => [p.user_id, p.id]));
    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const eduByProfile = new Map<string, any[]>();
    education.forEach((e: any) => {
      if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
      eduByProfile.get(e.profile_id)!.push(e);
    });

    const academicYears = [...new Set((surveys || []).map((s: any) => s.academic_year).filter(Boolean))].sort();
    const academicYearUserIds = new Set<string>();
    if (academicYear) {
      const matchingSurveys = (surveys || []).filter((s: any) => s.academic_year === academicYear).map((s: any) => s.id);
      const ids = new Set(matchingSurveys);
      (surveyResponses || []).forEach((r: any) => {
        if (ids.has(r.survey_id)) academicYearUserIds.add(r.user_id);
      });
    }

    const eligibleProfiles = profiles.filter((p: any) => {
      if (academicYear && !academicYearUserIds.has(p.user_id)) return false;
      const edu = eduByProfile.get(p.id) || [];
      if (batch && !edu.some((e: any) => String(e.year_graduated) === batch)) return false;
      if (course && !edu.some((e: any) => abbreviateProgram(e.program) === course)) return false;
      return true;
    });
    const eligibleProfileIds = new Set(eligibleProfiles.map((p: any) => p.id));

    const dateToMs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
    const dateFromMs = dateFrom ? new Date(dateFrom).getTime() : null;

    const records = employment.filter((e: any) => {
      if (!eligibleProfileIds.has(e.profile_id)) return false;
      if (!e.company_name) return false;
      if (typeFilter && !matchesEmploymentType(e.job_type, typeFilter)) return false;
      if (industryFilter && String(e.company_industry || '').trim() !== industryFilter) return false;
      if (companyFilter && normalize(e.company_name) !== normalize(companyFilter)) return false;
      const start = e.start_date ? new Date(e.start_date).getTime() : null;
      if (dateFromMs && start !== null && start < dateFromMs) return false;
      if (dateToMs && start !== null && start > dateToMs) return false;
      return true;
    });

    const companies = await safeCompanies();
    const partnershipTracked = await hasPartnershipColumn();
    const companyMap = new Map<string, any>();
    companies.forEach((c: any) => companyMap.set(normalize(c.name), c));

    interface EmployerAcc {
      name: string;
      alumni: Set<string>;
      employmentCount: number;
      hireYears: Set<number>;
      firstHireDate: string | null;
      lastHireDate: string | null;
      industryCounts: Record<string, number>;
      cityCounts: Record<string, number>;
      provinceCounts: Record<string, number>;
    }
    const employers = new Map<string, EmployerAcc>();

    records.forEach((e: any) => {
      const name = String(e.company_name).replace(/\s+/g, ' ').trim();
      if (!name) return;
      const key = normalize(name);
      if (!employers.has(key)) {
        employers.set(key, {
          name,
          alumni: new Set<string>(),
          employmentCount: 0,
          hireYears: new Set<number>(),
          firstHireDate: null,
          lastHireDate: null,
          industryCounts: {},
          cityCounts: {},
          provinceCounts: {},
        });
      }
      const acc = employers.get(key)!;
      acc.alumni.add(e.profile_id);
      acc.employmentCount++;
      const ind = String(e.company_industry || '').trim();
      if (ind) acc.industryCounts[ind] = (acc.industryCounts[ind] || 0) + 1;
      if (e.start_date) {
        const year = new Date(e.start_date).getFullYear();
        acc.hireYears.add(year);
        if (!acc.firstHireDate || e.start_date < acc.firstHireDate) acc.firstHireDate = e.start_date;
        if (!acc.lastHireDate || e.start_date > acc.lastHireDate) acc.lastHireDate = e.start_date;
      }
      const profile = profileMap.get(e.profile_id);
      if (profile?.city) acc.cityCounts[profile.city] = (acc.cityCounts[profile.city] || 0) + 1;
      if (profile?.province) acc.provinceCounts[profile.province] = (acc.provinceCounts[profile.province] || 0) + 1;
    });

    const employerList = [...employers.values()];
    const currentYear = new Date().getFullYear();

    const overview = {
      employingCompanies: employerList.length,
      partnerCompanies: partnershipTracked
        ? employerList.filter((e: any) => companyMap.get(normalize(e.name))?.partnership_status === 'partner').length
        : null,
      industriesRepresented: new Set(records.map((r: any) => String(r.company_industry || '').trim()).filter(Boolean)).size,
      newEmployersThisYear: employerList.filter((e: any) => e.hireYears.size > 0 && Math.min(...e.hireYears) === currentYear).length,
      averageAlumniPerEmployer: employerList.length > 0
        ? Math.round(employerList.reduce((a, e: any) => a + e.alumni.size, 0) / employerList.length * 10) / 10
        : 0,
      retentionRate: employerList.length > 0
        ? Math.round((employerList.filter((e: any) => e.hireYears.size >= 2).length / employerList.length) * 100)
        : 0,
    };

    const topEmployers = employerList
      .map((e: any) => ({
        name: e.name,
        alumniCount: e.alumni.size,
        employmentCount: e.employmentCount,
        industry: topKey(e.industryCounts) || '',
      }))
      .sort((a: any, b: any) => b.alumniCount - a.alumniCount || b.employmentCount - a.employmentCount)
      .slice(0, 12);

    const industryCount: Record<string, number> = {};
    records.forEach((r: any) => {
      const ind = String(r.company_industry || '').trim();
      if (!ind) return;
      industryCount[ind] = (industryCount[ind] || 0) + 1;
    });
    const industryTotal = Math.max(records.length, 1);
    const industryDistribution = Object.entries(industryCount)
      .map(([industry, count]) => ({ industry, count, percentage: Math.round((count / industryTotal) * 100) }))
      .sort((a, b) => b.count - a.count);

    const growthCount: Record<number, number> = {};
    employerList.forEach((e: any) => {
      if (e.hireYears.size === 0) return;
      const year = Math.min(...e.hireYears);
      growthCount[year] = (growthCount[year] || 0) + 1;
    });
    const employerGrowthTrend = Object.entries(growthCount)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);

    const cityCount: Record<string, number> = {};
    employerList.forEach((e: any) => {
      const city = topKey(e.cityCounts);
      if (city) cityCount[city] = (cityCount[city] || 0) + 1;
    });
    const locations = toRanked(cityCount);

    const topHiringCompanies = employerList
      .map((e: any) => ({
        name: e.name,
        industry: topKey(e.industryCounts) || '',
        alumniCount: e.alumni.size,
        employmentCount: e.employmentCount,
        firstHireDate: e.firstHireDate,
        lastHireDate: e.lastHireDate,
      }))
      .sort((a: any, b: any) => new Date(b.lastHireDate || 0).getTime() - new Date(a.lastHireDate || 0).getTime());

    const newEmployerPartners = employerList
      .filter((e: any) => {
        if (e.hireYears.size === 0 || Math.min(...e.hireYears) < currentYear - 1) return false;
        if (partnershipTracked) {
          return companyMap.get(normalize(e.name))?.partnership_status === 'partner';
        }
        return false;
      })
      .map((e: any) => ({
        name: e.name,
        industry: topKey(e.industryCounts) || '',
        alumniCount: e.alumni.size,
        firstHireYear: Math.min(...e.hireYears),
        firstHireDate: e.firstHireDate,
      }))
      .sort((a: any, b: any) => new Date(b.firstHireDate || 0).getTime() - new Date(a.firstHireDate || 0).getTime());

    const directory = employerList
      .map((e: any) => {
        const company = companyMap.get(normalize(e.name));
        return {
          name: e.name,
          industry: topKey(e.industryCounts) || company?.industry || '',
          alumniCount: e.alumni.size,
          employmentCount: e.employmentCount,
          city: company?.city || topKey(e.cityCounts) || '',
          province: company?.province || topKey(e.provinceCounts) || '',
          partnershipStatus: partnershipTracked ? (company?.partnership_status || null) : null,
        };
      })
      .sort((a: any, b: any) => b.alumniCount - a.alumniCount || b.employmentCount - a.employmentCount);

    const companiesList = [...new Set(records.map((r: any) => String(r.company_name).replace(/\s+/g, ' ').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    res.json({
      overview,
      partnershipTracked,
      topEmployers,
      industryDistribution,
      employerGrowthTrend,
      locations,
      topHiringCompanies,
      newEmployerPartners,
      directory,
      filters: {
        academicYears,
        batches: [...new Set(education.map((e: any) => e.year_graduated).filter(Boolean))].sort((a: any, b: any) => b - a),
        programs: [...new Set(education.map((e: any) => abbreviateProgram(e.program)).filter(Boolean))].sort(),
        industries: [...new Set(records.map((r: any) => String(r.company_industry || '').trim()).concat(profiles.map((p: any) => String(p.industry || '').trim())))]
          .filter(Boolean).sort(),
        companies: companiesList,
        employmentTypes: ['Full-time', 'Part-time', 'Contractual', 'Freelance', 'Internship'],
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/employer/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const norm = normalize(name);

    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');
    const alumniUsers = users || [];
    const alumniUserIds = alumniUsers.map((u: any) => u.id);

    let profiles: any[] = [];
    if (alumniUserIds.length > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, city, province, company_name, industry')
        .in('user_id', alumniUserIds);
      profiles = p || [];
    }

    const profileIds = profiles.map((p: any) => p.id);
    let education: any[] = [];
    let employment: any[] = [];
    if (profileIds.length > 0) {
      const [{ data: e }, { data: emp }] = await Promise.all([
        supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
        supabase.from('employment').select('profile_id, company_name, position, company_industry, job_type, start_date, end_date, is_current').in('profile_id', profileIds),
      ]);
      education = e || [];
      employment = emp || [];
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const eduByProfile = new Map<string, any[]>();
    education.forEach((e: any) => {
      if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
      eduByProfile.get(e.profile_id)!.push(e);
    });

    const records = employment.filter((e: any) => normalize(e.company_name) === norm);
    if (records.length === 0) throw new AppError('Employer not found', 404);

    const companies = await safeCompanies();
    const partnershipTracked = await hasPartnershipColumn();
    const company = companies.find((c: any) => normalize(c.name) === norm) || null;

    const gradYear = (profileId: string) => {
      const edu = eduByProfile.get(profileId) || [];
      const years = edu.map((e: any) => Number(e.year_graduated)).filter((y: number) => !isNaN(y)).sort((a, b) => a - b);
      return years[years.length - 1] || null;
    };

    const alumniMap = new Map<string, { name: string; positions: Set<string>; jobTypes: Set<string>; gradYear: number | null }>();
    records.forEach((e: any) => {
      const p = profileMap.get(e.profile_id);
      if (!p) return;
      if (!alumniMap.has(e.profile_id)) {
        alumniMap.set(e.profile_id, {
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
          positions: new Set<string>(),
          jobTypes: new Set<string>(),
          gradYear: gradYear(e.profile_id),
        });
      }
      const acc = alumniMap.get(e.profile_id)!;
      if (e.position) acc.positions.add(e.position);
      if (e.job_type) acc.jobTypes.add(String(e.job_type).toLowerCase());
    });

    const hiringCount: Record<number, number> = {};
    records.forEach((e: any) => {
      if (!e.start_date) return;
      const year = new Date(e.start_date).getFullYear();
      hiringCount[year] = (hiringCount[year] || 0) + 1;
    });

    const programCount: Record<string, number> = {};
    records.forEach((e: any) => {
      const edu = eduByProfile.get(e.profile_id) || [];
      edu.forEach((x: any) => {
        if (x.program) {
          const abbr = abbreviateProgram(x.program);
          programCount[abbr] = (programCount[abbr] || 0) + 1;
        }
      });
    });

    const typeCount: Record<string, number> = {};
    records.forEach((e: any) => {
      const t = String(e.job_type || '').toLowerCase();
      let key = 'Other';
      if (t === 'full-time') key = 'Full-time';
      else if (t === 'part-time') key = 'Part-time';
      else if (t === 'contract' || t === 'contractual') key = 'Contractual';
      else if (t === 'freelance') key = 'Freelance';
      else if (t === 'internship') key = 'Internship';
      typeCount[key] = (typeCount[key] || 0) + 1;
    });

    const firstHireDates = records.map((e: any) => e.start_date).filter(Boolean).sort();
    const firstHireDate = firstHireDates[0] || null;
    const lastHireDate = firstHireDates[firstHireDates.length - 1] || null;

    res.json({
      name,
      industry: company?.industry || topKey(records.reduce((acc: Record<string, number>, e: any) => {
        const ind = String(e.company_industry || '').trim();
        if (ind) acc[ind] = (acc[ind] || 0) + 1;
        return acc;
      }, {})) || '',
      city: company?.city || null,
      province: company?.province || null,
      website: company?.website || null,
      description: company?.description || null,
      partnershipStatus: partnershipTracked ? (company?.partnership_status || null) : null,
      partnershipTracked,
      overview: {
        alumniCount: alumniMap.size,
        employmentCount: records.length,
        firstHireDate,
        lastHireDate,
      },
      alumni: [...alumniMap.entries()].map(([profileId, a]) => ({
        profileId,
        name: a.name,
        position: [...a.positions][0] || null,
        jobType: [...a.jobTypes][0] || null,
        graduationYear: a.gradYear,
      })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      hiringHistory: Object.entries(hiringCount).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => a.year - b.year),
      programs: Object.entries(programCount).map(([program, count]) => ({ program, count })).sort((a, b) => b.count - a.count),
      employmentTypes: Object.entries(typeCount).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/employer/:name/partnership', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const partnershipStatus = req.body.partnership_status;
    if (!['partner', 'non-partner'].includes(partnershipStatus)) {
      throw new AppError('partnership_status must be "partner" or "non-partner"', 400);
    }

    const companies = await safeCompanies();
    const company = companies.find((c: any) => normalize(c.name) === normalize(name)) || null;

    let companyId: string | null = company?.id || null;
    if (companyId) {
      const { error } = await supabase
        .from('companies')
        .update({ partnership_status: partnershipStatus })
        .eq('id', companyId);
      if (error) throw new AppError(error.message, 500);
    } else {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name, partnership_status: partnershipStatus, is_active: true })
        .select()
        .single();
      if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
        throw new AppError('Companies table not available. Run the SQL migration first.', 400);
      }
      if (error) throw new AppError(error.message, 500);
      companyId = data?.id || null;
    }

    res.json({ partnershipStatus, companyId });
  } catch (err) {
    next(err);
  }
});

export default router;
