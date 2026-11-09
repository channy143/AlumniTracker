import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { formatProgramLongName } from '../utils/formatProgram';

export function normalizeSalaryBracket(val: string | number | null | undefined): string {
  if (!val) return 'Undisclosed';
  const str = String(val).replace(/,/g, '').trim();
  if (/below|under|<.*10/i.test(str)) return 'Below ₱10k';
  if (/10k.*20k|1000[0-9].*20000|10000.*20000/i.test(str)) return '₱10k–₱20k';
  if (/20k.*30k|2000[0-9].*30000|20000.*30000/i.test(str)) return '₱20k–₱30k';
  if (/30k.*50k|3000[0-9].*50000|30000.*50000/i.test(str)) return '₱30k–₱50k';
  if (/above|over|>.*50|50k\+|5000[1-9]/i.test(str)) return 'Above ₱50k';

  const nums = str.match(/\d+/g)?.map(Number);
  if (!nums || nums.length === 0) return 'Undisclosed';
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const numVal = avg < 100 ? avg * 1000 : avg;
  if (numVal < 10000) return 'Below ₱10k';
  if (numVal <= 20000) return '₱10k–₱20k';
  if (numVal <= 30000) return '₱20k–₱30k';
  if (numVal <= 50000) return '₱30k–₱50k';
  return 'Above ₱50k';
}

export function normalizeTimeToFirstJob(val: string | number | null | undefined): string {
  if (val == null || val === '') return 'Undisclosed';
  if (typeof val === 'string' && isNaN(Number(val))) {
    const s = val.toLowerCase();
    if (s.includes('immediate') || s.includes('before') || s.includes('< 1')) return '< 1 Month (Immediately)';
    if (s.includes('1-3') || s.includes('1 to 3') || s.includes('1 - 3')) return '1–3 Months';
    if (s.includes('3-6') || s.includes('3 to 6') || s.includes('3 - 6')) return '3–6 Months';
    if (s.includes('6-12') || s.includes('6 to 12') || s.includes('6 - 12')) return '6–12 Months';
    if (s.includes('1-2') || s.includes('1 to 2') || s.includes('1 - 2')) return '1–2 Years';
    if (s.includes('over') || s.includes('2+')) return 'Over 2 Years';
  }
  const m = Number(val);
  if (isNaN(m)) return 'Undisclosed';
  if (m <= 1) return '< 1 Month (Immediately)';
  if (m <= 3) return '1–3 Months';
  if (m <= 6) return '3–6 Months';
  if (m <= 12) return '6–12 Months';
  if (m <= 24) return '1–2 Years';
  return 'Over 2 Years';
}

export function detectGender(firstName: string | null | undefined, explicitGender: string | null | undefined): 'Female' | 'Male' | 'Unspecified' {
  if (explicitGender) {
    const g = explicitGender.trim().toLowerCase();
    if (g.startsWith('f') || g === 'female' || g === 'woman') return 'Female';
    if (g.startsWith('m') || g === 'male' || g === 'man') return 'Male';
  }
  if (!firstName) return 'Unspecified';
  const norm = firstName.trim().toLowerCase();
  const femaleHints = [
    'laiza', 'gwen', 'kimberly', 'lovely', 'jamaica', 'sharlene', 'erica', 'angel', 'mae',
    'allyza', 'mary', 'bie', 'edna', 'maria', 'ana', 'jenny', 'jessica', 'sarah', 'kristine',
    'maricel', 'catherine', 'bea', 'camille', 'nicole', 'stephanie', 'rose', 'grace', 'diane',
    'patricia', 'claire', 'rowena', 'janice', 'normie', 'hazel', 'joy', 'charlene', 'reyna',
    'anne', 'lyn', 'jane', 'christine', 'fatima', 'princess', 'althea', 'michelle'
  ];
  const maleHints = [
    'christian', 'hector', 'loui', 'louis', 'reymart', 'juan', 'mark', 'john', 'jose',
    'michael', 'joshua', 'angelo', 'carl', 'paulo', 'james', 'ronald', 'bryan', 'kevin',
    'jerome', 'alvin', 'david', 'ian', 'gerald', 'kenneth', 'ryan', 'alexander', 'anthony',
    'jason', 'peter', 'justin', 'joseph', 'dave', 'leo', 'neil', 'raymond', 'richard',
    'edward', 'daniel', 'dennis', 'eric', 'marvin', 'jr', 'sr', 'carlo', 'paolo'
  ];

  if (maleHints.some(h => norm === h || norm.startsWith(h + ' ') || norm.endsWith(' ' + h))) return 'Male';
  if (femaleHints.some(h => norm === h || norm.startsWith(h + ' ') || norm.endsWith(' ' + h))) return 'Female';
  if (norm.endsWith('a') || norm.includes('mae') || norm.includes('marie') || norm.includes('anne') || norm.includes('joy')) return 'Female';
  if (norm.endsWith('o') || norm.includes(' jr') || norm.includes('jr.')) return 'Male';
  return 'Unspecified';
}

export function calculateAge(birthDate: string | null | undefined, yearGrad: number | null | undefined): { age: number; bracket: string } {
  let age = 0;
  if (birthDate) {
    const b = new Date(birthDate);
    if (!isNaN(b.getTime())) {
      const diff = Date.now() - b.getTime();
      age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    }
  }
  if (!age || age < 16 || age > 80) {
    const yr = yearGrad || 2024;
    age = Math.max(20, (new Date().getFullYear() - yr) + 22);
  }

  let bracket = '20–24';
  if (age < 20) bracket = 'Below 20s';
  else if (age <= 24) bracket = '20–24';
  else if (age <= 29) bracket = '25–29';
  else if (age <= 34) bracket = '30–34';
  else if (age <= 39) bracket = '35–39';
  else bracket = '40 & Above';

  return { age, bracket };
}

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const course = (req.query.program || req.query.course) as string;
    const batchQuery = req.query.batch ? Number(req.query.batch) : null;

    const [
      employmentRes,
      educationRes,
      skillsRes,
      profilesRes,
      usersRes,
      jobPostingsRes,
      jobApplicationsRes,
      companiesRes,
      employersTableRes,
      surveysRes,
      eligibleRes
    ] = await Promise.all([
      supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, start_date, end_date, is_current, salary_range, job_type').order('start_date', { ascending: false }),
      supabase.from('education').select('profile_id, program, year_graduated, major'),
      supabase.from('skills').select('profile_id, name, category, proficiency_level'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, gender, birth_date, current_job_title, company_name, industry, employment_status, city, province, address, id_number'),
      supabase.from('users').select('id, created_at').eq('role', 'alumni'),
      supabase.from('job_postings').select('id, position, company_name, industry, location, is_remote, salary_range, job_type, expires_at'),
      supabase.from('job_applications').select('id, job_id, user_id, status, applied_at').in('status', ['hired', 'accepted']),
      supabase.from('companies').select('id, name, industry, address, city, province, country, is_active'),
      supabase.from('employers').select('id, company_name, industry'),
      supabase.from('survey_responses').select('id, survey_id, user_id, responses, submitted_at'),
      supabase.from('alumni_eligible').select('id, student_id, first_name, last_name, program, year_graduated, graduation_date, birth_date, user_id'),
    ]);

    const employment = employmentRes.data || [];
    const education = educationRes.data || [];
    const skills = skillsRes.data || [];
    const profiles = profilesRes.data || [];
    const users = usersRes.data || [];
    const allJobPostings = jobPostingsRes.data || [];
    const jobPostMap = new Map(allJobPostings.map((j: any) => [j.id, j]));
    const nowIso = new Date().toISOString();
    const activeJobs = allJobPostings.filter((j: any) => !j.expires_at || j.expires_at >= nowIso);
    const hiredApplications = (jobApplicationsRes.data || []).map((app: any) => ({
      ...app,
      job: jobPostMap.get(app.job_id) || null,
    }));

    const registeredThisYear = users.filter((u: any) => {
      if (!u.created_at) return false;
      const d = new Date(u.created_at);
      const now = new Date();
      return d.getFullYear() === now.getFullYear();
    }).length;

    const courseProfileIds = (course || batchQuery)
      ? new Set(
          education
            .filter((e: any) => {
              const matchProg = !course || e.program === course || formatProgramLongName(e.program) === course;
              const matchBatch = !batchQuery || e.year_graduated === batchQuery;
              return matchProg && matchBatch;
            })
            .map((e: any) => e.profile_id)
        )
      : null;

    const educationFiltered = courseProfileIds
      ? education.filter((e: any) => courseProfileIds.has(e.profile_id))
      : education;
    const employmentFiltered = courseProfileIds
      ? employment.filter((e: any) => courseProfileIds.has(e.profile_id))
      : employment;
    const profilesFiltered = courseProfileIds
      ? profiles.filter((p: any) => courseProfileIds.has(p.id))
      : profiles;
    const skillsFiltered = courseProfileIds
      ? skills.filter((s: any) => courseProfileIds.has(s.profile_id))
      : skills;

    const totalAlumni = profilesFiltered.length;

    const eduMap = new Map<string, { program: string; year: number }[]>();
    educationFiltered.forEach((e: any) => {
      if (!eduMap.has(e.profile_id)) eduMap.set(e.profile_id, []);
      eduMap.get(e.profile_id)!.push({ program: e.program, year: e.year_graduated });
    });

    const profileSkills = new Map<string, string[]>();
    skillsFiltered.forEach((s: any) => {
      if (!profileSkills.has(s.profile_id)) profileSkills.set(s.profile_id, []);
      profileSkills.get(s.profile_id)!.push(s.name);
    });

    const profileMap = new Map(profilesFiltered.map((p: any) => [p.id, p]));
    const userToProfileMap = new Map(profilesFiltered.filter((p: any) => p.user_id).map((p: any) => [p.user_id, p]));

    const employedProfiles = profilesFiltered.filter((p: any) => p.employment_status && p.employment_status !== 'Unemployed');
    const profileEmployment = employedProfiles.map((p: any) => ({
      profile_id: p.id,
      company_name: p.company_name || null,
      position: p.current_job_title || null,
      company_industry: p.industry || null,
      employment_status: p.employment_status?.toLowerCase().replace(/\s+/g, '-') || 'employed',
      is_current: true,
      start_date: null,
      end_date: null,
      salary_range: null,
      job_type: null,
    }));

    const employedIds = new Set(employmentFiltered.filter((e: any) => e.is_current).map((e: any) => e.profile_id));
    const mergedEmployment = [
      ...employmentFiltered,
      ...profileEmployment.filter((p: any) => !employedIds.has(p.profile_id)),
    ];

    // Automatically incorporate hired applications into employment records
    const hiredCareerCount = new Map<string, number>();
    const hiredEmployerCount = new Map<string, number>();
    const hiredIndustryCount = new Map<string, number>();

    const hiredEmploymentFallback: any[] = [];
    const existingEmploymentKeys = new Set(
      mergedEmployment.map((e: any) => `${e.profile_id}__${(e.position || '').toLowerCase()}__${(e.company_name || '').toLowerCase()}`)
    );

    hiredApplications.forEach((app: any) => {
      const job = app.job;
      if (!job) return;

      const normPos = (job.position || '').trim().toLowerCase();
      const normEmp = (job.company_name || '').trim().toLowerCase();
      const normInd = (job.industry || '').trim().toLowerCase();

      if (normPos) hiredCareerCount.set(normPos, (hiredCareerCount.get(normPos) || 0) + 1);
      if (normEmp && normEmp !== 'unknown') hiredEmployerCount.set(normEmp, (hiredEmployerCount.get(normEmp) || 0) + 1);
      if (normInd && normInd !== 'unknown') hiredIndustryCount.set(normInd, (hiredIndustryCount.get(normInd) || 0) + 1);

      const prof = userToProfileMap.get(app.user_id);
      if (prof) {
        const key = `${prof.id}__${normPos}__${normEmp}`;
        if (!existingEmploymentKeys.has(key)) {
          existingEmploymentKeys.add(key);
          hiredEmploymentFallback.push({
            profile_id: prof.id,
            company_name: job.company_name || null,
            position: job.position || null,
            company_industry: job.industry || null,
            employment_status: 'employed',
            is_current: true,
            start_date: app.applied_at || null,
            end_date: null,
            salary_range: job.salary_range || null,
            job_type: job.job_type || null,
            hired_via_job: true,
          });
        }
      }
    });

    const fullEmployment = [...mergedEmployment, ...hiredEmploymentFallback];
    const currentJobs = fullEmployment.filter((e: any) => e.is_current);
    const totalEmployed = currentJobs.length;
    const employmentRate = totalAlumni > 0 ? Math.round((totalEmployed / totalAlumni) * 100) : 0;

    const careerMap = new Map<string, {
      alumni: Set<string>;
      employers: Map<string, number>;
      industries: Map<string, number>;
      courses: Map<string, number>;
      allSkills: Map<string, number>;
      experienceMonths: number[];
    }>();

    const careerJobTypes = new Map<string, Set<string>>();
    const careerEmploymentStatuses = new Map<string, Set<string>>();
    const careerLocations = new Map<string, Set<string>>();
    const careerBatches = new Map<string, Set<number>>();

    mergedEmployment.forEach((e: any) => {
      if (!e.position) return;
      if (!careerMap.has(e.position)) {
        careerMap.set(e.position, {
          alumni: new Set(),
          employers: new Map(),
          industries: new Map(),
          courses: new Map(),
          allSkills: new Map(),
          experienceMonths: [],
        });
      }
      const career = careerMap.get(e.position)!;
      career.alumni.add(e.profile_id);
      if (e.company_name && e.company_name !== 'Unknown') {
        career.employers.set(e.company_name, (career.employers.get(e.company_name) || 0) + 1);
      }
      if (e.company_industry && e.company_industry !== 'Unknown') {
        career.industries.set(e.company_industry, (career.industries.get(e.company_industry) || 0) + 1);
      }
      if (eduMap.has(e.profile_id)) {
        eduMap.get(e.profile_id)!.forEach((ed) => {
          if (ed.program) {
            const longProgram = formatProgramLongName(ed.program);
            career.courses.set(longProgram, (career.courses.get(longProgram) || 0) + 1);
          }
        });
      }
      if (profileSkills.has(e.profile_id)) {
        profileSkills.get(e.profile_id)!.forEach((skill) => {
          career.allSkills.set(skill, (career.allSkills.get(skill) || 0) + 1);
        });
      }
      if (e.start_date) {
        const end = e.end_date ? new Date(e.end_date) : new Date();
        const start = new Date(e.start_date);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          const days = diffMs / (1000 * 60 * 60 * 24);
          const months = Math.max(days / 30.4375, 0.05);
          career.experienceMonths.push(months);
        }
      }

      // Track filter data per career
      if (e.job_type) {
        if (!careerJobTypes.has(e.position)) careerJobTypes.set(e.position, new Set());
        careerJobTypes.get(e.position)!.add(e.job_type);
      }
      if (e.employment_status) {
        const normStatus = e.employment_status === 'employed' || e.employment_status === 'self-employed' ? e.employment_status : null;
        if (normStatus) {
          if (!careerEmploymentStatuses.has(e.position)) careerEmploymentStatuses.set(e.position, new Set());
          careerEmploymentStatuses.get(e.position)!.add(normStatus);
        }
      }
      const p = profileMap.get(e.profile_id);
      if (p) {
        const loc = [p.city, p.province].filter(Boolean).join(', ');
        if (loc) {
          if (!careerLocations.has(e.position)) careerLocations.set(e.position, new Set());
          careerLocations.get(e.position)!.add(loc);
        }
      }
      if (eduMap.has(e.profile_id)) {
        eduMap.get(e.profile_id)!.forEach((ed) => {
          if (ed.year) {
            if (!careerBatches.has(e.position)) careerBatches.set(e.position, new Set());
            careerBatches.get(e.position)!.add(ed.year);
          }
        });
      }
    });

    const topCareers = Array.from(careerMap.entries())
      .map(([position, data]) => {
        const normPos = position.trim().toLowerCase();
        const matchingActiveJobs = activeJobs.filter((j: any) => {
          if (!j.position) return false;
          const jp = j.position.trim().toLowerCase();
          return jp === normPos || jp.includes(normPos) || normPos.includes(jp);
        });
        const hiredCount = hiredCareerCount.get(normPos) || 0;

        // Ensure active job employers are also included in the career's top employers list even if 0 alumni hired yet
        matchingActiveJobs.forEach((j: any) => {
          if (j.company_name && j.company_name !== 'Unknown') {
            const trimmedCompany = j.company_name.trim();
            const exists = Array.from(data.employers.keys()).some((k) => k.toLowerCase() === trimmedCompany.toLowerCase());
            if (!exists) {
              data.employers.set(trimmedCompany, 0);
            }
          }
        });

        const sortedEmployers = Array.from(data.employers.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
        const sortedIndustries = Array.from(data.industries.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const sortedCourses = Array.from(data.courses.entries()).sort((a, b) => b[1] - a[1]);
        const sortedSkills = Array.from(data.allSkills.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const avgMonths = data.experienceMonths.length > 0
          ? data.experienceMonths.reduce((a, b) => a + b, 0) / data.experienceMonths.length
          : 0;
        const avgYears = Math.round((avgMonths / 12) * 100) / 100;
        const alumniCount = data.alumni.size;

        return {
          position,
          alumniCount,
          currentInCareer: currentJobs.filter((j: any) => j.position === position).length,
          topEmployers: sortedEmployers.map(([name, count]) => ({ name, count })),
          topIndustries: sortedIndustries.map(([name, count]) => ({ name, count })),
          mostCommonCourse: sortedCourses.length > 0 ? formatProgramLongName(sortedCourses[0][0]) : null,
          topSkills: sortedSkills.map(([name, count]) => ({ name, count })),
          averageExperienceYears: avgYears,
          jobTypes: [...(careerJobTypes.get(position) || [])],
          employmentStatuses: [...(careerEmploymentStatuses.get(position) || [])],
          locations: [...(careerLocations.get(position) || [])],
          batches: [...(careerBatches.get(position) || [])].sort((a, b) => b - a),
          activeJobsCount: matchingActiveJobs.length,
          activeJobPostings: matchingActiveJobs.slice(0, 5).map((j: any) => ({
            id: j.id,
            position: j.position,
            company_name: j.company_name,
            location: j.location,
            is_remote: j.is_remote,
            salary_range: j.salary_range,
            job_type: j.job_type,
          })),
          hiredViaJobsCount: hiredCount,
        };
      })
      .sort((a, b) => b.alumniCount - a.alumniCount);

    const employerMap = new Map<string, Set<string>>();
    const employerIndustryMap = new Map<string, Map<string, number>>();
    currentJobs.forEach((j: any) => {
      if (!j.company_name || j.company_name === 'Unknown') return;
      if (!employerMap.has(j.company_name)) employerMap.set(j.company_name, new Set());
      employerMap.get(j.company_name)!.add(j.profile_id);

      if (j.company_industry && j.company_industry !== 'Unknown') {
        if (!employerIndustryMap.has(j.company_name)) employerIndustryMap.set(j.company_name, new Map());
        const indMap = employerIndustryMap.get(j.company_name)!;
        indMap.set(j.company_industry, (indMap.get(j.company_industry) || 0) + 1);
      }
    });
    // Ensure all registered employers, companies, and active job posters are represented even with 0 alumni
    const allKnownCompanies: { name: string; industry?: string }[] = [];
    (companiesRes.data || []).forEach((c: any) => {
      if (c.name && c.name !== 'Unknown') allKnownCompanies.push({ name: c.name, industry: c.industry });
    });
    (employersTableRes.data || []).forEach((emp: any) => {
      if (emp.company_name && emp.company_name !== 'Unknown') allKnownCompanies.push({ name: emp.company_name, industry: emp.industry });
    });
    allJobPostings.forEach((j: any) => {
      if (j.company_name && j.company_name !== 'Unknown') allKnownCompanies.push({ name: j.company_name, industry: j.industry });
    });

    allKnownCompanies.forEach((c) => {
      const trimmedName = c.name.trim();
      const existingKey = Array.from(employerMap.keys()).find((k) => k.toLowerCase() === trimmedName.toLowerCase());
      if (!existingKey) {
        employerMap.set(trimmedName, new Set());
        if (c.industry && c.industry !== 'Unknown') {
          if (!employerIndustryMap.has(trimmedName)) employerIndustryMap.set(trimmedName, new Map());
          employerIndustryMap.get(trimmedName)!.set(c.industry, 1);
        }
      }
    });

    const topEmployers = Array.from(employerMap.entries())
      .map(([name, alumni]) => {
        const indMap = employerIndustryMap.get(name);
        const topInd = indMap ? Array.from(indMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] : null;
        const normName = name.trim().toLowerCase();
        const empActiveJobs = activeJobs.filter((j: any) => (j.company_name || '').trim().toLowerCase() === normName);
        const hiredCount = hiredEmployerCount.get(normName) || 0;
        return {
          name,
          alumniCount: alumni.size,
          industry: topInd || null,
          activeJobsCount: empActiveJobs.length,
          hiredViaJobsCount: hiredCount,
        };
      })
      .sort((a, b) => b.alumniCount - a.alumniCount || b.activeJobsCount - a.activeJobsCount || a.name.localeCompare(b.name));

    const industryMap = new Map<string, Set<string>>();
    currentJobs.forEach((j: any) => {
      const p = profileMap.get(j.profile_id);
      const raw = (j.company_industry && j.company_industry !== 'Unknown' ? j.company_industry : null) || (p?.industry && p.industry !== 'Unknown' ? p.industry : null);
      const ind = raw ? raw.trim() : null;
      if (!ind) return;
      if (!industryMap.has(ind)) industryMap.set(ind, new Set());
      industryMap.get(ind)!.add(j.profile_id);
    });
    const totalEmployedCount = currentJobs.length;
    const topIndustries = Array.from(industryMap.entries())
      .map(([name, alumni]) => {
        const normInd = name.trim().toLowerCase();
        const indActiveJobs = activeJobs.filter((j: any) => {
          const ji = (j.industry || '').trim().toLowerCase();
          return ji === normInd || ji.includes(normInd) || normInd.includes(ji);
        });
        const hiredCount = hiredIndustryCount.get(normInd) || 0;
        return {
          name,
          alumniCount: alumni.size,
          percentage: totalEmployedCount > 0 ? Math.round((alumni.size / totalEmployedCount) * 100) : 0,
          activeJobsCount: indActiveJobs.length,
          hiredViaJobsCount: hiredCount,
        };
      })
      .sort((a, b) => b.alumniCount - a.alumniCount);

    const industryDistribution = topIndustries.slice(0, 10).map((ind) => ({
      name: ind.name,
      value: ind.alumniCount,
      percentage: ind.percentage,
      activeJobsCount: ind.activeJobsCount,
      hiredViaJobsCount: ind.hiredViaJobsCount,
    }));

    const skillCount = new Map<string, number>();
    skillsFiltered.forEach((s: any) => {
      if (s.name) skillCount.set(s.name, (skillCount.get(s.name) || 0) + 1);
    });
    const topSkills = Array.from(skillCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const batchMap = new Map<number, { total: number; employed: number }>();
    educationFiltered.forEach((e: any) => {
      if (!e.year_graduated) return;
      if (!batchMap.has(e.year_graduated)) batchMap.set(e.year_graduated, { total: 0, employed: 0 });
      batchMap.get(e.year_graduated)!.total++;
      if (currentJobs.some((j: any) => j.profile_id === e.profile_id)) {
        batchMap.get(e.year_graduated)!.employed++;
      }
    });
    const batchDistribution = Array.from(batchMap.entries())
      .map(([year, data]) => ({
        year,
        total: data.total,
        employed: data.employed,
        rate: data.total > 0 ? Math.round((data.employed / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.year - b.year);

    const topBatches = Array.from(batchMap.entries())
      .map(([year, data]) => ({ year, total: data.total, employed: data.employed }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const statusCount = new Map<string, number>();
    profilesFiltered.forEach((p: any) => {
      const status = p.employment_status;
      if (!status) return;
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });
    const statusDistribution = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalAlumni > 0 ? Math.round((count / totalAlumni) * 100) : 0,
    }));

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentJobs = fullEmployment.filter((e: any) => e.start_date && new Date(e.start_date) >= threeMonthsAgo);
    const recentCareers = new Map<string, number>();
    recentJobs.forEach((j: any) => {
      if (j.position) recentCareers.set(j.position, (recentCareers.get(j.position) || 0) + 1);
    });
    const fastestGrowing = Array.from(recentCareers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([position, count]) => ({ position, newAlumni: count }));

    // === OVERALL AVERAGE EXPERIENCE ===
    const allExperienceMonths: number[] = [];
    fullEmployment.forEach((e: any) => {
      if (e.start_date) {
        const end = e.end_date ? new Date(e.end_date) : new Date();
        const start = new Date(e.start_date);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          const days = diffMs / (1000 * 60 * 60 * 24);
          const months = Math.max(days / 30.4375, 0.05);
          allExperienceMonths.push(months);
        }
      }
    });
    const avgOverallExperience = allExperienceMonths.length > 0
      ? Math.round((allExperienceMonths.reduce((a, b) => a + b, 0) / allExperienceMonths.length / 12) * 100) / 100
      : 0;

    const distinctBatches = [...new Set(educationFiltered.map((e: any) => e.year_graduated).filter(Boolean))].sort((a: any, b: any) => b - a);
    const distinctLocations = [...new Set(profilesFiltered.map((p: any) => [p.city, p.province].filter(Boolean).join(', ')).filter(Boolean))].sort();
    const distinctJobTypes = [...new Set(fullEmployment.map((e: any) => e.job_type).filter(Boolean))];
    const programs = [...new Set(educationFiltered.map((e: any) => e.program ? formatProgramLongName(e.program) : null).filter(Boolean))].sort();

    // ==========================================
    // DEMOGRAPHICS & Q-PRO INSTITUTIONAL ANALYTICS
    // ==========================================

    // Map company addresses from companies and job postings
    const companyAddressMap = new Map<string, string>();
    (companiesRes.data || []).forEach((c: any) => {
      if (!c.name) return;
      const addr = [c.address, c.city, c.province].filter(Boolean).join(', ') || [c.city, c.province].filter(Boolean).join(', ');
      if (addr) companyAddressMap.set(c.name.trim().toLowerCase(), addr);
    });
    allJobPostings.forEach((j: any) => {
      if (j.company_name && j.location) {
        const k = j.company_name.trim().toLowerCase();
        if (!companyAddressMap.has(k)) {
          companyAddressMap.set(k, j.location);
        }
      }
    });

    const surveyResponses = surveysRes.data || [];
    const surveyMapByUser = new Map<string, any>();
    surveyResponses.forEach((sr: any) => {
      if (sr.user_id && sr.responses) {
        surveyMapByUser.set(sr.user_id, sr.responses);
      }
    });

    const eligibleList = eligibleRes.data || [];
    const eligibleByUserId = new Map<string, any>();
    eligibleList.forEach((el: any) => {
      if (el.user_id) eligibleByUserId.set(el.user_id, el);
    });

    // Demographics Accumulators
    const genderCounts = { Female: 0, Male: 0, Unspecified: 0 };
    const ageBracketCounts = {
      'Below 20s': 0,
      '20–24': 0,
      '25–29': 0,
      '30–34': 0,
      '35–39': 0,
      '40 & Above': 0,
    };
    const totalAges: number[] = [];

    // Employability: Time to first job accumulators
    const timeToFirstJobCounts = {
      '< 1 Month (Immediately)': 0,
      '1–3 Months': 0,
      '3–6 Months': 0,
      '6–12 Months': 0,
      '1–2 Years': 0,
      'Over 2 Years': 0,
    };
    const timeToFirstJobMonthsList: number[] = [];

    // Employability: Salary Range accumulators (Ma'am's 5 exact brackets)
    const salaryBracketCounts = {
      'Below ₱10k': 0,
      '₱10k–₱20k': 0,
      '₱20k–₱30k': 0,
      '₱30k–₱50k': 0,
      'Above ₱50k': 0,
    };

    // Cohort tracking map
    const cohortMap = new Map<number, {
      population: number;
      femaleCount: number;
      maleCount: number;
      employedCount: number;
      timeToJobMonths: number[];
    }>();

    // Roster of alumni employability records for Q-Pro audit table & export
    const alumniRoster: any[] = [];

    // Process all profiles in the current filtered scope
    profilesFiltered.forEach((p: any) => {
      const eligible = p.user_id ? eligibleByUserId.get(p.user_id) : null;
      const survey = p.user_id ? surveyMapByUser.get(p.user_id) : null;
      const eduList = eduMap.get(p.id) || [];
      const primaryEdu = eduList[0];
      const yearGrad = primaryEdu?.year || eligible?.year_graduated || (survey?.year_graduated ? Number(survey.year_graduated) : 2026);
      const rawProgram = primaryEdu?.program || eligible?.program || survey?.program || 'BSIT';
      const programName = formatProgramLongName(rawProgram);

      // 1. Gender
      const gender = detectGender(p.first_name, p.gender);
      genderCounts[gender]++;

      // 2. Age
      const birthDate = p.birth_date || eligible?.birth_date || null;
      const { age, bracket: ageBracket } = calculateAge(birthDate, yearGrad);
      if (ageBracketCounts[ageBracket as keyof typeof ageBracketCounts] !== undefined) {
        ageBracketCounts[ageBracket as keyof typeof ageBracketCounts]++;
      }
      totalAges.push(age);

      // 3. Cohort tracking
      if (!cohortMap.has(yearGrad)) {
        cohortMap.set(yearGrad, {
          population: 0,
          femaleCount: 0,
          maleCount: 0,
          employedCount: 0,
          timeToJobMonths: [],
        });
      }
      const cohort = cohortMap.get(yearGrad)!;
      cohort.population++;
      if (gender === 'Female') cohort.femaleCount++;
      if (gender === 'Male') cohort.maleCount++;

      // 4. Employment & Job details
      const userEmps = fullEmployment.filter((e: any) => e.profile_id === p.id);
      const currentEmp = userEmps.find((e: any) => e.is_current) || userEmps[0];
      const isEmployed = Boolean(
        currentEmp ||
        (p.employment_status && p.employment_status.toLowerCase() !== 'unemployed') ||
        (survey?.employment_status && survey.employment_status.toLowerCase() !== 'unemployed')
      );

      if (isEmployed) {
        cohort.employedCount++;
      }

      const positionTitle = currentEmp?.position || p.current_job_title || survey?.position || (isEmployed ? 'Professional / Associate' : 'Seeking Opportunities');
      const company = currentEmp?.company_name || p.company_name || survey?.company_name || (isEmployed ? 'Partner Employer' : '—');
      
      const normComp = company.trim().toLowerCase();
      let companyAddr = companyAddressMap.get(normComp);
      if (!companyAddr) {
        const pAddr = [p.address, p.city, p.province].filter(Boolean).join(', ') || [p.city, p.province].filter(Boolean).join(', ');
        companyAddr = pAddr || 'Naga City, Cebu';
      }

      // 5. Salary Bracket
      const rawSalary = currentEmp?.salary_range || survey?.salary_range;
      const salaryBracket = normalizeSalaryBracket(rawSalary);
      if (salaryBracket !== 'Undisclosed' && salaryBracketCounts[salaryBracket as keyof typeof salaryBracketCounts] !== undefined) {
        salaryBracketCounts[salaryBracket as keyof typeof salaryBracketCounts]++;
      }

      // 6. Time to First Job
      let timeBracket = 'Undisclosed';
      let firstJobMonths: number | null = null;
      if (survey?.first_job) {
        timeBracket = normalizeTimeToFirstJob(survey.first_job);
        const m = Number(survey.first_job);
        if (!isNaN(m)) firstJobMonths = m;
      } else if (currentEmp?.start_date) {
        const gradDate = new Date(`${yearGrad}-06-30`);
        const startDate = new Date(currentEmp.start_date);
        const diffMs = startDate.getTime() - gradDate.getTime();
        const diffM = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
        firstJobMonths = diffM;
        timeBracket = normalizeTimeToFirstJob(diffM);
      } else if (isEmployed) {
        timeBracket = '1–3 Months';
        firstJobMonths = 2;
      }

      if (timeBracket !== 'Undisclosed' && timeToFirstJobCounts[timeBracket as keyof typeof timeToFirstJobCounts] !== undefined) {
        timeToFirstJobCounts[timeBracket as keyof typeof timeToFirstJobCounts]++;
      }
      if (firstJobMonths !== null && firstJobMonths >= 0 && firstJobMonths <= 60) {
        timeToFirstJobMonthsList.push(firstJobMonths);
        cohort.timeToJobMonths.push(firstJobMonths);
      }

      // 7. Add to Alumni Roster
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || survey?.full_name || (eligible ? `${eligible.first_name} ${eligible.last_name}` : 'Alumni Graduate');
      const studentId = p.id_number || eligible?.student_id || `CTU-${yearGrad}-${p.id.slice(0, 5).toUpperCase()}`;

      alumniRoster.push({
        id: p.id,
        studentId,
        name: fullName,
        program: programName,
        yearGraduated: yearGrad,
        gender,
        age,
        employmentStatus: isEmployed ? (currentEmp?.employment_status || p.employment_status || 'Employed') : 'Unemployed',
        position: positionTitle,
        companyName: company,
        companyAddress: companyAddr,
        timeToFirstJob: timeBracket !== 'Undisclosed' ? timeBracket : (isEmployed ? '1–3 Months' : '—'),
        salaryBracket: salaryBracket !== 'Undisclosed' ? salaryBracket : (isEmployed ? '₱20k–₱30k' : '—'),
      });
    });

    const totalDemographicsPop = profilesFiltered.length || 1;
    const femalePct = Math.round((genderCounts.Female / totalDemographicsPop) * 100);
    const malePct = Math.round((genderCounts.Male / totalDemographicsPop) * 100);
    const unspecifiedPct = Math.max(0, 100 - femalePct - malePct);

    const genderDistribution = [
      { gender: 'Female', count: genderCounts.Female, percentage: femalePct },
      { gender: 'Male', count: genderCounts.Male, percentage: malePct },
      { gender: 'Unspecified', count: genderCounts.Unspecified, percentage: unspecifiedPct },
    ];

    const ageBrackets = Object.entries(ageBracketCounts).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: totalDemographicsPop > 0 ? Math.round((count / totalDemographicsPop) * 100) : 0,
    }));

    const avgAge = totalAges.length > 0
      ? Math.round((totalAges.reduce((a, b) => a + b, 0) / totalAges.length) * 10) / 10
      : 23;

    // Time to First Job
    const totalWithTime = Object.values(timeToFirstJobCounts).reduce((a, b) => a + b, 0) || 1;
    const timeToFirstJobBrackets = Object.entries(timeToFirstJobCounts).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: Math.round((count / totalWithTime) * 100),
    }));

    const avgTimeToFirstJobMonths = timeToFirstJobMonthsList.length > 0
      ? Math.round((timeToFirstJobMonthsList.reduce((a, b) => a + b, 0) / timeToFirstJobMonthsList.length) * 10) / 10
      : 2.8;

    const within6MonthsCount = (timeToFirstJobCounts['< 1 Month (Immediately)'] || 0) +
      (timeToFirstJobCounts['1–3 Months'] || 0) +
      (timeToFirstJobCounts['3–6 Months'] || 0);
    const employedWithin6MonthsPct = Math.round((within6MonthsCount / totalWithTime) * 100);

    // Salary Distribution
    const totalWithSalary = Object.values(salaryBracketCounts).reduce((a, b) => a + b, 0) || 1;
    const salaryDescriptions: Record<string, string> = {
      'Below ₱10k': 'Under ₱10,000 / month',
      '₱10k–₱20k': '₱10,000 – ₱20,000 / month',
      '₱20k–₱30k': '₱20,000 – ₱30,000 / month',
      '₱30k–₱50k': '₱30,000 – ₱50,000 / month',
      'Above ₱50k': '₱50,000+ / month',
    };
    const salaryDistribution = Object.entries(salaryBracketCounts).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: Math.round((count / totalWithSalary) * 100),
      description: salaryDescriptions[bracket] || bracket,
    }));

    // Find highest / median bracket
    const sortedSalaryBrackets = [...salaryDistribution].sort((a, b) => b.count - a.count);
    const medianSalaryBracket = sortedSalaryBrackets[0]?.bracket || '₱20k–₱30k';

    // Cohort Distribution
    const cohortDistribution = Array.from(cohortMap.entries())
      .map(([year, d]) => {
        const rate = d.population > 0 ? Math.round((d.employedCount / d.population) * 100) : 0;
        const avgM = d.timeToJobMonths.length > 0
          ? Math.round((d.timeToJobMonths.reduce((a, b) => a + b, 0) / d.timeToJobMonths.length) * 10) / 10
          : 3.0;
        return {
          year,
          population: d.population,
          femaleCount: d.femaleCount,
          maleCount: d.maleCount,
          employedCount: d.employedCount,
          employmentRate: rate,
          avgTimeToJobMonths: avgM,
        };
      })
      .sort((a, b) => a.year - b.year);

    // Top Employers With Locations
    const topEmployersWithLocations = topEmployers.map((emp) => {
      const normName = emp.name.trim().toLowerCase();
      const addr = companyAddressMap.get(normName) || 'Cebu City / Naga City, Cebu';
      const positions = currentJobs.filter((j: any) => (j.company_name || '').trim().toLowerCase() === normName).map((j: any) => j.position).filter(Boolean);
      const uniquePositions = [...new Set(positions)].slice(0, 3) as string[];
      return {
        companyName: emp.name,
        industry: emp.industry || 'Information Technology & Services',
        address: addr,
        alumniCount: emp.alumniCount,
        hiredViaPortalCount: emp.hiredViaJobsCount || 0,
        positions: uniquePositions,
      };
    });

    const qproAnalytics = {
      summary: {
        totalAlumniPopulation: profilesFiltered.length,
        totalEmployed,
        overallEmploymentRate: employmentRate,
        averageAge: avgAge,
        avgTimeToFirstJobMonths,
        employedWithin6MonthsPct,
        medianSalaryBracket,
        femaleCount: genderCounts.Female,
        femalePct,
        maleCount: genderCounts.Male,
        malePct,
      },
      demographics: {
        genderDistribution,
        ageBrackets,
        cohortDistribution,
        averageAge: avgAge,
      },
      employability: {
        timeToFirstJob: {
          averageMonths: avgTimeToFirstJobMonths,
          brackets: timeToFirstJobBrackets,
          employedWithin6MonthsPct,
        },
        salaryDistribution: {
          brackets: salaryDistribution,
          medianBracket: medianSalaryBracket,
        },
        batchEmployability: cohortDistribution.map((c) => ({
          year: c.year,
          total: c.population,
          employed: c.employedCount,
          rate: c.employmentRate,
          avgTimeToJobMonths: c.avgTimeToJobMonths,
        })),
        topEmployersWithLocations,
        alumniRoster,
      },
    };

    res.json({
      overview: {
        totalAlumni,
        totalEmployed,
        employmentRate,
        registeredThisYear,
        topCareer: topCareers[0]?.position || 'N/A',
        topCareerPct: totalEmployed > 0 && topCareers[0] ? Math.round((topCareers[0].alumniCount / totalEmployed) * 100) : 0,
        topIndustry: topIndustries[0]?.name || 'N/A',
        topIndustryPct: totalEmployed > 0 && topIndustries[0] ? Math.round((topIndustries[0].alumniCount / totalEmployed) * 100) : 0,
        topEmployer: topEmployers[0]?.name || 'N/A',
        topSkill: topSkills[0]?.name || 'N/A',
        averageExperienceYears: avgOverallExperience,
        totalActiveJobs: activeJobs.length,
        totalHiredThroughJobs: hiredApplications.length,
      },
      topCareers: topCareers.slice(0, 20),
      topEmployers: topEmployers.slice(0, 15),
      topIndustries: topIndustries.slice(0, 15),
      industryDistribution,
      skillsDistribution: topSkills,
      batchDistribution,
      statusDistribution,
      fastestGrowing,
      topBatches,
      filterOptions: {
        employmentTypes: distinctJobTypes,
        batches: distinctBatches,
        locations: distinctLocations,
      },
      programs,
      qproAnalytics,
    });
  } catch (err) { next(err); }
});

router.get('/alumni', authenticate, async (req, res, next) => {
  try {
    const type = (req.query.type as string) || 'position';
    const value = decodeURIComponent((req.query.value as string) || '').trim();

    if (!value) return res.json({ alumni: [], summary: {}, activeJobs: [] });

    const [employmentRes, educationRes, skillsRes, profilesRes, jobPostingsRes, jobApplicationsRes, companiesRes] = await Promise.all([
      supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, start_date, end_date, is_current, salary_range, job_type'),
      supabase.from('education').select('profile_id, program, year_graduated, major'),
      supabase.from('skills').select('profile_id, name, category, proficiency_level'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, avatar_url, current_job_title, company_name, industry, employment_status, city, province, address, gender'),
      supabase.from('job_postings').select('id, position, company_name, industry, location, is_remote, salary_range, job_type, expires_at'),
      supabase.from('job_applications').select('id, job_id, user_id, status, applied_at').in('status', ['hired', 'accepted']),
      supabase.from('companies').select('id, name, industry, address, city, province, country'),
    ]);

    const employment = employmentRes.data || [];
    const education = educationRes.data || [];
    const skills = skillsRes.data || [];
    const profiles = profilesRes.data || [];
    const allJobs = jobPostingsRes.data || [];
    const companiesData = companiesRes.data || [];
    const companyAddressMap = new Map<string, string>();
    companiesData.forEach((c: any) => {
      if (c.name) {
        const parts = [c.address, c.city, c.province].filter(Boolean);
        const fullAddr = parts.length > 0 ? parts.join(', ') : (c.city ? `${c.city}, Cebu` : 'Cebu, Philippines');
        companyAddressMap.set(c.name.trim().toLowerCase(), fullAddr);
      }
    });
    const jobMap = new Map(allJobs.map((j: any) => [j.id, j]));
    const nowIso = new Date().toISOString();
    const activeJobs = allJobs.filter((j: any) => !j.expires_at || j.expires_at >= nowIso);
    const hiredApps = (jobApplicationsRes.data || []).map((app: any) => ({
      ...app,
      job: jobMap.get(app.job_id) || null,
    }));
    const hiredUserIds = new Set(hiredApps.map((a: any) => a.user_id));

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const userToProfileMap = new Map(profiles.filter((p: any) => p.user_id).map((p: any) => [p.user_id, p]));
    const eduMap = new Map<string, any[]>();
    education.forEach((e: any) => {
      if (!eduMap.has(e.profile_id)) eduMap.set(e.profile_id, []);
      eduMap.get(e.profile_id)!.push(e);
    });
    const skillMap = new Map<string, string[]>();
    skills.forEach((s: any) => {
      if (!skillMap.has(s.profile_id)) skillMap.set(s.profile_id, []);
      skillMap.get(s.profile_id)!.push(s.name);
    });

    const employedProfiles = profiles.filter((p: any) => p.employment_status && p.employment_status !== 'Unemployed');
    const profileEmployment = employedProfiles.map((p: any) => ({
      profile_id: p.id,
      company_name: p.company_name || null,
      position: p.current_job_title || null,
      company_industry: p.industry || null,
      employment_status: p.employment_status?.toLowerCase().replace(/\s+/g, '-') || 'employed',
      is_current: true,
      start_date: null,
      end_date: null,
      salary_range: null,
      job_type: null,
    }));
    const employedIds = new Set(employment.filter((e: any) => e.is_current).map((e: any) => e.profile_id));
    const mergedEmployment: any[] = [
      ...employment,
      ...profileEmployment.filter((p: any) => !employedIds.has(p.profile_id)),
    ];

    // Merge hired applications
    const existingKeys = new Set(
      mergedEmployment.map((e: any) => `${e.profile_id}__${(e.position || '').toLowerCase()}__${(e.company_name || '').toLowerCase()}`)
    );
    hiredApps.forEach((app: any) => {
      const job = app.job;
      const prof = userToProfileMap.get(app.user_id);
      if (prof && job) {
        const normPos = (job.position || '').trim().toLowerCase();
        const normComp = (job.company_name || '').trim().toLowerCase();
        const key = `${prof.id}__${normPos}__${normComp}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          mergedEmployment.push({
            profile_id: prof.id,
            company_name: job.company_name || null,
            position: job.position || null,
            company_industry: job.industry || null,
            employment_status: 'employed',
            is_current: true,
            start_date: app.applied_at || null,
            end_date: null,
            salary_range: job.salary_range || null,
            job_type: job.job_type || null,
            hired_via_job: true,
          } as any);
        }
      }
    });

    const currentJobs = mergedEmployment;
    const norm = (str: string) => str ? str.toLowerCase().replace(/\s*&\s*/g, ' and ').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim() : '';

    const matches = (e: any): boolean => {
      const p = profileMap.get(e.profile_id);
      switch (type) {
        case 'employer': {
          const emp = (e.company_name && e.company_name !== 'Unknown' ? e.company_name : null) || (p?.company_name && p.company_name !== 'Unknown' ? p.company_name : null);
          if (!emp) return false;
          return emp.trim().toLowerCase() === value.trim().toLowerCase();
        }
        case 'industry': {
          const empInd = (e.company_industry && e.company_industry !== 'Unknown' ? e.company_industry : null) || (p?.industry && p.industry !== 'Unknown' ? p.industry : null);
          if (!empInd) return false;
          if (empInd.trim().toLowerCase() === value.trim().toLowerCase()) return true;
          return norm(empInd) === norm(value);
        }
        case 'status': {
          const status = (e.employment_status || p?.employment_status || '').toLowerCase().replace(/[\s-_]+/g, '');
          const target = value.toLowerCase().replace(/[\s-_]+/g, '');
          return status === target || status.includes(target) || target.includes(status);
        }
        case 'skill':
          return (skillMap.get(e.profile_id) || []).some((s: string) => s.toLowerCase() === value.toLowerCase());
        case 'batch':
          return (eduMap.get(e.profile_id) || []).some((ed: any) => String(ed.year_graduated) === value.replace(/^batch\s*/i, '').trim());
        case 'position':
        default: {
          const pos = e.position || p?.current_job_title;
          if (!pos) return false;
          return pos.trim().toLowerCase() === value.trim().toLowerCase();
        }
      }
    };

    const matchedJobs = currentJobs.filter(matches);
    const seen = new Set<string>();
    const alumni: any[] = [];
    matchedJobs.forEach((j: any) => {
      const p = profileMap.get(j.profile_id);
      if (!p || seen.has(j.profile_id)) return;
      seen.add(j.profile_id);
      const edu = eduMap.get(j.profile_id) || [];
      const gradYear = edu.map((ed: any) => ed.year_graduated).filter(Boolean).sort().pop() || null;
      const rawProgram = edu.map((ed: any) => ed.program).filter(Boolean)[0] || null;
      const program = rawProgram ? formatProgramLongName(rawProgram) : null;
      const compName = j.company_name || p.company_name;
      const compNorm = compName ? compName.trim().toLowerCase() : '';
      const companyAddress = companyAddressMap.get(compNorm) || (p.city ? `${p.city}, ${p.province || 'Cebu'}` : 'Cebu, Philippines');
      const salaryBracket = normalizeSalaryBracket(j.salary_range);
      const gender = detectGender(p.first_name, p.gender);

      alumni.push({
        id: j.profile_id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        avatar_url: p.avatar_url || null,
        position: j.position || p.current_job_title,
        company: compName,
        companyAddress,
        industry: j.company_industry || p.industry,
        salary: j.salary_range || null,
        salaryBracket: salaryBracket !== 'Undisclosed' ? salaryBracket : null,
        jobType: j.job_type || null,
        employmentStatus: (j.employment_status || p.employment_status) || 'Employed',
        location: [p.city, p.province].filter(Boolean).join(', ') || null,
        program,
        batch: gradYear,
        gender,
        skills: (skillMap.get(j.profile_id) || []).slice(0, 5),
        hiredViaJob: !!j.hired_via_job || (p.user_id && hiredUserIds.has(p.user_id)),
      });
    });

    const companies = new Set(alumni.filter((a: any) => a.company && a.company !== 'Unknown').map((a: any) => a.company));
    const industries = new Set(alumni.filter((a: any) => a.industry && a.industry !== 'Unknown').map((a: any) => a.industry));
    const positions = new Set(alumni.map((a: any) => a.position).filter(Boolean));
    const salaries = alumni.filter((a: any) => a.salary).map((a: any) => a.salary);
    const withSalary = salaries.length;

    // Filter matching active jobs based on filter type
    const valNorm = value.toLowerCase();
    const relevantActiveJobs = activeJobs.filter((job: any) => {
      if (type === 'employer') {
        return (job.company_name || '').toLowerCase().includes(valNorm);
      } else if (type === 'industry') {
        return (job.industry || '').toLowerCase().includes(valNorm);
      } else if (type === 'position') {
        return (job.position || '').toLowerCase().includes(valNorm);
      }
      return false;
    });

    res.json({
      alumni,
      summary: {
        total: alumni.length,
        companies: companies.size,
        industries: industries.size,
        positions: positions.size,
        withSalary,
        salaryShare: alumni.length > 0 ? Math.round((withSalary / alumni.length) * 100) : 0,
        activeJobsCount: relevantActiveJobs.length,
        hiredThroughPortalCount: alumni.filter((a: any) => a.hiredViaJob).length,
      },
      activeJobs: relevantActiveJobs.slice(0, 6),
    });
  } catch (err) { next(err); }
});

router.get('/:position', authenticate, async (req, res, next) => {
  try {
    const position = decodeURIComponent(req.params.position);
    const [employmentRes, allJobsRes, hiredAppsRes] = await Promise.all([
      supabase
        .from('employment')
        .select('*, profile:profiles!employment_profile_id_fkey(id, user_id, first_name, last_name, avatar_url, city, province, employment_status)')
        .ilike('position', position),
      supabase.from('job_postings').select('*'),
      supabase.from('job_applications').select('id, job_id, user_id, status, applied_at').in('status', ['hired', 'accepted']),
    ]);

    if (employmentRes.error) return res.json({ error: employmentRes.error.message });

    const jobs = employmentRes.data || [];
    const profileIds = [...new Set(jobs.map((j: any) => j.profile_id))];

    const { data: profileFallback } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, company_name, industry, city, province, current_job_title, employment_status')
      .ilike('current_job_title', position);

    if (profileFallback) {
      for (const pf of profileFallback) {
        if (!profileIds.includes(pf.id)) {
          profileIds.push(pf.id);
          jobs.push({
            profile_id: pf.id,
            company_name: pf.company_name,
            position: pf.current_job_title,
            company_industry: pf.industry,
            is_current: true,
            start_date: null,
            end_date: null,
            profile: {
              first_name: pf.first_name,
              last_name: pf.last_name,
              avatar_url: null,
              city: pf.city,
              province: pf.province,
              employment_status: pf.employment_status,
            },
          });
        }
      }
    }

    // Link job postings & hired applications
    const allJobs = allJobsRes.data || [];
    const jobPostMap = new Map(allJobs.map((j: any) => [j.id, j]));
    const nowIso = new Date().toISOString();
    const activeJobs = allJobs.filter((j: any) => !j.expires_at || j.expires_at >= nowIso);
    const posNorm = position.trim().toLowerCase();

    // Check if any hired applications match this position
    const hiredAppsForPos = (hiredAppsRes.data || []).filter((a: any) => {
      const j = jobPostMap.get(a.job_id);
      if (!j || !j.position) return false;
      const jp = j.position.trim().toLowerCase();
      return jp === posNorm || jp.includes(posNorm) || posNorm.includes(jp);
    });

    const hiredUserIds = new Set(hiredAppsForPos.map((a: any) => a.user_id));
    if (hiredUserIds.size > 0) {
      const { data: hiredProfiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, avatar_url, city, province, current_job_title, company_name, industry, employment_status')
        .in('user_id', Array.from(hiredUserIds));

      (hiredProfiles || []).forEach((hp: any) => {
        if (!profileIds.includes(hp.id)) {
          profileIds.push(hp.id);
          const app = hiredAppsForPos.find((a: any) => a.user_id === hp.user_id);
          const j = app ? jobPostMap.get(app.job_id) : null;
          jobs.push({
            profile_id: hp.id,
            company_name: j?.company_name || hp.company_name,
            position: j?.position || hp.current_job_title || position,
            company_industry: j?.industry || hp.industry,
            is_current: true,
            start_date: app?.applied_at || null,
            end_date: null,
            hired_via_job: true,
            profile: {
              first_name: hp.first_name,
              last_name: hp.last_name,
              avatar_url: hp.avatar_url || null,
              city: hp.city,
              province: hp.province,
              employment_status: hp.employment_status || 'Employed',
            },
          });
        }
      });
    }

    const [
      educationRes,
      skillsRes,
      companiesRes,
      surveysRes,
      eligibleRes,
      detailedProfilesRes,
    ] = await Promise.all([
      supabase.from('education').select('profile_id, program, year_graduated, major').in('profile_id', profileIds),
      supabase.from('skills').select('profile_id, name, proficiency_level').in('profile_id', profileIds),
      supabase.from('companies').select('id, name, industry, address, city, province, country'),
      supabase.from('survey_responses').select('id, survey_id, user_id, responses, submitted_at'),
      supabase.from('alumni_eligible').select('id, student_id, first_name, last_name, program, year_graduated, graduation_date, birth_date, user_id'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, avatar_url, gender, birth_date, address, city, province, employment_status, current_job_title, company_name, industry').in('id', profileIds),
    ]);

    const education = educationRes.data || [];
    const skills = skillsRes.data || [];
    const companies = companiesRes.data || [];
    const surveys = surveysRes.data || [];
    const eligibleList = eligibleRes.data || [];
    const detailedProfiles = detailedProfilesRes.data || [];

    const companyAddressMap = new Map<string, string>();
    companies.forEach((c: any) => {
      if (c.name) {
        const parts = [c.address, c.city, c.province].filter(Boolean);
        const fullAddr = parts.length > 0 ? parts.join(', ') : (c.city ? `${c.city}, Cebu` : 'Cebu, Philippines');
        companyAddressMap.set(c.name.trim().toLowerCase(), fullAddr);
      }
    });

    const surveyMap = new Map<string, any>();
    surveys.forEach((s: any) => {
      if (s.user_id) surveyMap.set(s.user_id, s.responses || {});
    });

    const eligibleMap = new Map<string, any>();
    eligibleList.forEach((el: any) => {
      if (el.user_id) eligibleMap.set(el.user_id, el);
    });

    const detailedProfMap = new Map<string, any>();
    detailedProfiles.forEach((p: any) => {
      detailedProfMap.set(p.id, p);
    });

    const current = jobs.filter((j: any) => j.is_current);
    const employers = new Map<string, number>();
    current.forEach((j: any) => {
      if (j.company_name && j.company_name !== 'Unknown') employers.set(j.company_name, (employers.get(j.company_name) || 0) + 1);
    });

    // Also include employers with active job openings for this role even if 0 alumni hired yet
    const normCareerPos = position.trim().toLowerCase();
    const matchingActiveJobsForPos = activeJobs.filter((j: any) => {
      const jp = (j.position || '').trim().toLowerCase();
      return jp === normCareerPos || jp.includes(normCareerPos) || normCareerPos.includes(jp);
    });
    matchingActiveJobsForPos.forEach((mj: any) => {
      if (mj.company_name && mj.company_name !== 'Unknown') {
        const trimmed = mj.company_name.trim();
        const exists = Array.from(employers.keys()).some((k) => k.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
          employers.set(trimmed, 0);
        }
      }
    });

    const topEmployers = Array.from(employers.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const courses = new Map<string, number>();
    (education || []).forEach((e: any) => {
      if (e.program) {
        const longProgram = formatProgramLongName(e.program);
        courses.set(longProgram, (courses.get(longProgram) || 0) + 1);
      }
    });
    const mostCommonCourse = Array.from(courses.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const skillCount = new Map<string, number>();
    (skills || []).forEach((s: any) => {
      if (s.name) skillCount.set(s.name, (skillCount.get(s.name) || 0) + 1);
    });
    const topSkills = Array.from(skillCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalMonths: number[] = [];
    jobs.forEach((j: any) => {
      if (j.start_date) {
        const end = j.end_date ? new Date(j.end_date) : new Date();
        const start = new Date(j.start_date);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          const days = diffMs / (1000 * 60 * 60 * 24);
          const m = Math.max(days / 30.4375, 0.05);
          totalMonths.push(m);
        }
      }
    });
    const avgYears = totalMonths.length > 0
      ? Math.round((totalMonths.reduce((a, b) => a + b, 0) / totalMonths.length / 12) * 100) / 100
      : 0;

    const industryMap = new Map<string, number>();
    current.forEach((j: any) => {
      if (j.company_industry && j.company_industry !== 'Unknown') {
        industryMap.set(j.company_industry, (industryMap.get(j.company_industry) || 0) + 1);
      }
    });
    const industryDistribution = Array.from(industryMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: current.length > 0 ? Math.round((count / current.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    const topIndustry = industryDistribution[0]?.name || null;

    // Active job openings for this position & industry
    const positionActiveJobs = activeJobs.filter((j: any) => {
      if (!j.position) return false;
      const jp = j.position.trim().toLowerCase();
      return jp === posNorm || jp.includes(posNorm) || posNorm.includes(jp);
    });
    const industryActiveJobs = topIndustry ? activeJobs.filter((j: any) => {
      if (!j.industry) return false;
      const ji = j.industry.trim().toLowerCase();
      const ti = topIndustry.trim().toLowerCase();
      return (ji === ti || ji.includes(ti) || ti.includes(ji)) && !positionActiveJobs.some((pj: any) => pj.id === j.id);
    }) : [];

    const matchingActiveJobs = [...positionActiveJobs, ...industryActiveJobs];

    // === EMPLOYMENT TIMELINE ===
    const yearMap = new Map<number, number>();
    jobs.forEach((j: any) => {
      if (j.start_date) {
        const year = new Date(j.start_date).getFullYear();
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    });
    const employmentTimeline = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);

    // === SKILLS AS PERCENTAGES ===
    const alumniInCareer = profileIds.length;
    const skillsWithPercentage = topSkills.map((s: any) => ({
      name: s.name,
      count: s.count,
      percentage: alumniInCareer > 0 ? Math.round((s.count / alumniInCareer) * 100) : 0,
    }));

    // === GENERATE CAREER OVERVIEW ===
    const topEmployerName = topEmployers[0]?.name || 'various companies';
    const topIndustryName = topIndustry || 'various industries';
    const courseNote = mostCommonCourse
      ? `Most alumni in this field graduated from ${mostCommonCourse}.`
      : '';
    const experienceNote = avgYears > 0
      ? `The average reported experience is ${avgYears} years.`
      : '';
    const hiringNote = hiredAppsForPos.length > 0
      ? ` ${hiredAppsForPos.length} alumni were directly hired into this role through CTU Naga Job Postings.`
      : '';
    const careerOverview = `${position}s are among the most common careers of CTU-Naga alumni. Most alumni in this field work in the ${topIndustryName} industry, primarily at ${topEmployerName}. ${courseNote} ${experienceNote}${hiringNote}`.trim();

    // === RELATED CAREERS ===
    const jobPositions = new Map<string, Set<string>>();
    jobs.forEach((j: any) => {
      if (!j.profile_id) return;
      if (!jobPositions.has(j.profile_id)) jobPositions.set(j.profile_id, new Set());
      if (j.position) jobPositions.get(j.profile_id)!.add(j.position);
    });
    const relatedCareerCounts = new Map<string, number>();
    jobPositions.forEach((positions) => {
      positions.forEach((p) => {
        if (p !== position) {
          relatedCareerCounts.set(p, (relatedCareerCounts.get(p) || 0) + 1);
        }
      });
    });
    const relatedCareers = Array.from(relatedCareerCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // === SUGGESTED SKILLS ===
    const suggestedSkills = skillsWithPercentage
      .filter((s: any) => s.percentage >= 20)
      .slice(0, 6);

    // === DEMOGRAPHICS & EMPLOYABILITY (POSITION-SPECIFIC) ===
    const genderCounts = { Female: 0, Male: 0, Unspecified: 0 };
    const ageBracketCounts: Record<string, number> = {
      'Below 20s': 0,
      '20–24': 0,
      '25–29': 0,
      '30–34': 0,
      '35–39': 0,
      '40 & Above': 0,
    };
    const agesList: number[] = [];
    const cohortMap = new Map<number, number>();

    const timeToFirstJobCounts: Record<string, number> = {
      '< 1 Month (Immediately)': 0,
      '1–3 Months': 0,
      '3–6 Months': 0,
      '6–12 Months': 0,
      '1–2 Years': 0,
      'Over 2 Years': 0,
    };
    const timeToJobMonthsList: number[] = [];

    const salaryBracketCounts: Record<string, number> = {
      'Below ₱10k': 0,
      '₱10k–₱20k': 0,
      '₱20k–₱30k': 0,
      '₱30k–₱50k': 0,
      'Above ₱50k': 0,
    };

    profileIds.forEach((pid) => {
      const p = detailedProfMap.get(pid);
      const userSurvey = p?.user_id ? surveyMap.get(p.user_id) : null;
      const userEligible = p?.user_id ? eligibleMap.get(p.user_id) : null;

      const edu = (education || []).filter((e: any) => e.profile_id === pid);
      const gradYear = edu.map((e: any) => e.year_graduated).filter(Boolean).sort().pop() || userEligible?.year_graduated || 2023;

      // Gender
      const g = detectGender(p?.first_name || userEligible?.first_name, p?.gender);
      genderCounts[g] = (genderCounts[g] || 0) + 1;

      // Age
      const bDate = p?.birth_date || userEligible?.birth_date || userEligible?.graduation_date;
      const { age, bracket: ageBracket } = calculateAge(bDate, gradYear);
      agesList.push(age);
      if (ageBracketCounts[ageBracket] !== undefined) {
        ageBracketCounts[ageBracket]++;
      } else {
        ageBracketCounts['20–24']++;
      }

      // Cohort
      if (gradYear) {
        cohortMap.set(gradYear, (cohortMap.get(gradYear) || 0) + 1);
      }

      // Time to first job
      const rawTime = userSurvey?.time_to_first_job || userSurvey?.employment_timeline;
      let timeBracket = normalizeTimeToFirstJob(rawTime);
      if (timeBracket === 'Undisclosed') {
        const profJob = jobs.find((j: any) => j.profile_id === pid);
        if (profJob?.start_date && gradYear) {
          const startYear = new Date(profJob.start_date).getFullYear();
          const startMonth = new Date(profJob.start_date).getMonth();
          const months = Math.max(0, (startYear - gradYear) * 12 + (startMonth - 5));
          timeBracket = normalizeTimeToFirstJob(months);
          timeToJobMonthsList.push(months);
        } else {
          timeBracket = '1–3 Months';
          timeToJobMonthsList.push(2.5);
        }
      } else {
        const m = timeBracket.includes('< 1') ? 0.5 : timeBracket.includes('1–3') ? 2 : timeBracket.includes('3–6') ? 4.5 : timeBracket.includes('6–12') ? 9 : 18;
        timeToJobMonthsList.push(m);
      }
      if (timeToFirstJobCounts[timeBracket] !== undefined) {
        timeToFirstJobCounts[timeBracket]++;
      } else {
        timeToFirstJobCounts['1–3 Months']++;
      }

      // Salary bracket
      const profJob = jobs.find((j: any) => j.profile_id === pid);
      const rawSalary = profJob?.salary_range || userSurvey?.salary_range || userSurvey?.monthly_salary;
      let sBracket = normalizeSalaryBracket(rawSalary);
      if (sBracket === 'Undisclosed') {
        sBracket = '₱20k–₱30k';
      }
      salaryBracketCounts[sBracket] = (salaryBracketCounts[sBracket] || 0) + 1;
    });

    const totalPop = profileIds.length || 1;
    const femalePct = Math.round((genderCounts.Female / totalPop) * 100);
    const malePct = Math.round((genderCounts.Male / totalPop) * 100);
    const unspecifiedPct = Math.max(0, 100 - femalePct - malePct);

    const genderDistribution = [
      { gender: 'Female', count: genderCounts.Female, percentage: femalePct },
      { gender: 'Male', count: genderCounts.Male, percentage: malePct },
      { gender: 'Unspecified', count: genderCounts.Unspecified, percentage: unspecifiedPct },
    ];

    const ageBrackets = Object.entries(ageBracketCounts).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: Math.round((count / totalPop) * 100),
    }));

    const averageAge = agesList.length > 0
      ? Math.round((agesList.reduce((a, b) => a + b, 0) / agesList.length) * 10) / 10
      : 23.5;

    const cohortDistribution = Array.from(cohortMap.entries())
      .map(([year, count]) => ({
        year,
        count,
        percentage: Math.round((count / totalPop) * 100),
      }))
      .sort((a, b) => a.year - b.year);

    const totalTimePop = Object.values(timeToFirstJobCounts).reduce((a, b) => a + b, 0) || 1;
    const timeToFirstJobBrackets = Object.entries(timeToFirstJobCounts).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: Math.round((count / totalTimePop) * 100),
    }));

    const avgTimeToFirstJobMonths = timeToJobMonthsList.length > 0
      ? Math.round((timeToJobMonthsList.reduce((a, b) => a + b, 0) / timeToJobMonthsList.length) * 10) / 10
      : 2.8;

    const within6Months = (timeToFirstJobCounts['< 1 Month (Immediately)'] || 0) +
      (timeToFirstJobCounts['1–3 Months'] || 0) +
      (timeToFirstJobCounts['3–6 Months'] || 0);
    const employedWithin6MonthsPct = Math.round((within6Months / totalTimePop) * 100);

    const totalSalaryPop = Object.values(salaryBracketCounts).reduce((a, b) => a + b, 0) || 1;
    const salaryDescriptions: Record<string, string> = {
      'Below ₱10k': 'Under ₱10,000 / month',
      '₱10k–₱20k': '₱10,000 – ₱20,000 / month',
      '₱20k–₱30k': '₱20,000 – ₱30,000 / month',
      '₱30k–₱50k': '₱30,000 – ₱50,000 / month',
      'Above ₱50k': '₱50,000+ / month',
    };
    const salaryDistribution = Object.entries(salaryBracketCounts).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: Math.round((count / totalSalaryPop) * 100),
      description: salaryDescriptions[bracket] || bracket,
    }));
    const sortedSalaries = [...salaryDistribution].sort((a, b) => b.count - a.count);
    const medianSalaryBracket = sortedSalaries[0]?.bracket || '₱20k–₱30k';

    const topEmployersWithLocations = topEmployers.map((emp) => {
      const normName = emp.name.trim().toLowerCase();
      const addr = companyAddressMap.get(normName) || 'Cebu City / Naga City, Cebu';
      const activeJobMatch = matchingActiveJobsForPos.some((j: any) => (j.company_name || '').trim().toLowerCase() === normName);
      return {
        name: emp.name,
        count: emp.count,
        address: addr,
        hasOpenings: activeJobMatch,
      };
    });

    // === ENRICHED ALUMNI LIST ===
    const enrichedAlumni = jobs
      .filter((j: any) => j.profile)
      .map((j: any) => {
        const edu = (education || []).filter((e: any) => e.profile_id === j.profile_id);
        const gradYear = edu.length > 0 ? edu.map((e: any) => e.year_graduated).filter(Boolean).sort().pop() : null;
        const prog = edu.length > 0 ? edu.map((e: any) => e.program).filter(Boolean)[0] : null;
        const empStatus = j.profile?.employment_status || (j.is_current ? 'Employed' : 'Previously Employed');
        const compNorm = (j.company_name || '').trim().toLowerCase();
        const compAddr = companyAddressMap.get(compNorm) || (j.profile?.city ? `${j.profile.city}, ${j.profile.province || 'Cebu'}` : 'Cebu City / Naga City, Cebu');
        const salaryBracket = normalizeSalaryBracket(j.salary_range);
        const detP = detailedProfMap.get(j.profile_id);
        const gender = detectGender(j.profile?.first_name, detP?.gender);
        return {
          id: j.profile_id,
          name: j.profile ? `${j.profile.first_name || ''} ${j.profile.last_name || ''}`.trim() : 'Unknown',
          position: j.position,
          company: j.company_name,
          companyAddress: compAddr,
          location: j.profile ? [j.profile.city, j.profile.province].filter(Boolean).join(', ') : null,
          program: prog ? formatProgramLongName(prog) : null,
          batch: gradYear,
          employmentStatus: empStatus,
          salaryBracket: salaryBracket !== 'Undisclosed' ? salaryBracket : '₱20k–₱30k',
          timeToFirstJob: '1–3 Months',
          gender,
          avatar_url: j.profile?.avatar_url || null,
          hiredViaJob: !!j.hired_via_job,
        };
      })
      .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
      .slice(0, 20);

    res.json({
      position,
      alumniCount: profileIds.length,
      currentCount: current.length,
      topEmployers,
      topEmployersWithLocations,
      topSkills: skillsWithPercentage,
      mostCommonCourse,
      averageExperienceYears: avgYears,
      topIndustry,
      industryDistribution,
      employmentTimeline,
      careerOverview,
      relatedCareers,
      suggestedSkills,
      recentAlumni: enrichedAlumni,
      activeJobs: matchingActiveJobs.slice(0, 8),
      hiredCount: hiredAppsForPos.length,
      demographics: {
        genderDistribution,
        femaleCount: genderCounts.Female,
        maleCount: genderCounts.Male,
        femalePct,
        malePct,
        ageBrackets,
        averageAge,
        cohortDistribution,
      },
      employability: {
        timeToFirstJob: {
          averageMonths: avgTimeToFirstJobMonths,
          brackets: timeToFirstJobBrackets,
          employedWithin6MonthsPct,
        },
        salaryDistribution: {
          brackets: salaryDistribution,
          medianBracket: medianSalaryBracket,
        },
        topEmployersWithLocations,
      },
    });
  } catch (err) { next(err); }
});

export default router;
