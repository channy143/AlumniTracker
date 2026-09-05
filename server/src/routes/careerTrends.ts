import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const course = req.query.course as string;

    const [employmentRes, educationRes, skillsRes, profilesRes, usersRes, jobPostingsRes, jobApplicationsRes] = await Promise.all([
      supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, start_date, end_date, is_current, salary_range, job_type').order('start_date', { ascending: false }),
      supabase.from('education').select('profile_id, program, year_graduated, major'),
      supabase.from('skills').select('profile_id, name, category, proficiency_level'),
      supabase.from('profiles').select('id, user_id, current_job_title, company_name, industry, employment_status, city, province'),
      supabase.from('users').select('id, created_at').eq('role', 'alumni'),
      supabase.from('job_postings').select('id, position, company_name, industry, location, is_remote, salary_range, job_type, expires_at'),
      supabase.from('job_applications').select('id, job_id, user_id, status, applied_at').in('status', ['hired', 'accepted']),
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

    const courseProfileIds = course
      ? new Set(education.filter((e: any) => e.program === course).map((e: any) => e.profile_id))
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
          if (ed.program) career.courses.set(ed.program, (career.courses.get(ed.program) || 0) + 1);
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
        const sortedEmployers = Array.from(data.employers.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const sortedIndustries = Array.from(data.industries.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const sortedCourses = Array.from(data.courses.entries()).sort((a, b) => b[1] - a[1]);
        const sortedSkills = Array.from(data.allSkills.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const avgMonths = data.experienceMonths.length > 0
          ? data.experienceMonths.reduce((a, b) => a + b, 0) / data.experienceMonths.length
          : 0;
        const avgYears = Math.round((avgMonths / 12) * 100) / 100;
        const alumniCount = data.alumni.size;

        const normPos = position.trim().toLowerCase();
        const matchingActiveJobs = activeJobs.filter((j: any) => {
          if (!j.position) return false;
          const jp = j.position.trim().toLowerCase();
          return jp === normPos || jp.includes(normPos) || normPos.includes(jp);
        });
        const hiredCount = hiredCareerCount.get(normPos) || 0;

        return {
          position,
          alumniCount,
          currentInCareer: currentJobs.filter((j: any) => j.position === position).length,
          topEmployers: sortedEmployers.map(([name, count]) => ({ name, count })),
          topIndustries: sortedIndustries.map(([name, count]) => ({ name, count })),
          mostCommonCourse: sortedCourses.length > 0 ? sortedCourses[0][0] : null,
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
      .sort((a, b) => b.alumniCount - a.alumniCount);

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
    const programs = [...new Set(educationFiltered.map((e: any) => e.program).filter(Boolean))].sort();

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
    });
  } catch (err) { next(err); }
});

router.get('/alumni', authenticate, async (req, res, next) => {
  try {
    const type = (req.query.type as string) || 'position';
    const value = decodeURIComponent((req.query.value as string) || '').trim();

    if (!value) return res.json({ alumni: [], summary: {}, activeJobs: [] });

    const [employmentRes, educationRes, skillsRes, profilesRes, jobPostingsRes, jobApplicationsRes] = await Promise.all([
      supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, start_date, end_date, is_current, salary_range, job_type'),
      supabase.from('education').select('profile_id, program, year_graduated, major'),
      supabase.from('skills').select('profile_id, name, category, proficiency_level'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, avatar_url, current_job_title, company_name, industry, employment_status, city, province'),
      supabase.from('job_postings').select('id, position, company_name, industry, location, is_remote, salary_range, job_type, expires_at'),
      supabase.from('job_applications').select('id, job_id, user_id, status, applied_at').in('status', ['hired', 'accepted']),
    ]);

    const employment = employmentRes.data || [];
    const education = educationRes.data || [];
    const skills = skillsRes.data || [];
    const profiles = profilesRes.data || [];
    const allJobs = jobPostingsRes.data || [];
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
      const program = edu.map((ed: any) => ed.program).filter(Boolean)[0] || null;
      alumni.push({
        id: j.profile_id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        avatar_url: p.avatar_url || null,
        position: j.position || p.current_job_title,
        company: j.company_name || p.company_name,
        industry: j.company_industry || p.industry,
        salary: j.salary_range || null,
        jobType: j.job_type || null,
        employmentStatus: (j.employment_status || p.employment_status) || 'Employed',
        location: [p.city, p.province].filter(Boolean).join(', ') || null,
        program,
        batch: gradYear,
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

    const { data: education } = await supabase
      .from('education')
      .select('profile_id, program, year_graduated, major')
      .in('profile_id', profileIds);

    const { data: skills } = await supabase
      .from('skills')
      .select('profile_id, name, proficiency_level')
      .in('profile_id', profileIds);

    const current = jobs.filter((j: any) => j.is_current);
    const employers = new Map<string, number>();
    current.forEach((j: any) => {
      if (j.company_name && j.company_name !== 'Unknown') employers.set(j.company_name, (employers.get(j.company_name) || 0) + 1);
    });
    const topEmployers = Array.from(employers.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const courses = new Map<string, number>();
    (education || []).forEach((e: any) => {
      if (e.program) courses.set(e.program, (courses.get(e.program) || 0) + 1);
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

    // === ENRICHED ALUMNI LIST ===
    const enrichedAlumni = jobs
      .filter((j: any) => j.profile)
      .map((j: any) => {
        const edu = (education || []).filter((e: any) => e.profile_id === j.profile_id);
        const gradYear = edu.length > 0 ? edu.map((e: any) => e.year_graduated).filter(Boolean).sort().pop() : null;
        const prog = edu.length > 0 ? edu.map((e: any) => e.program).filter(Boolean)[0] : null;
        const empStatus = j.profile?.employment_status || (j.is_current ? 'Employed' : 'Previously Employed');
        return {
          id: j.profile_id,
          name: j.profile ? `${j.profile.first_name || ''} ${j.profile.last_name || ''}`.trim() : 'Unknown',
          position: j.position,
          company: j.company_name,
          location: j.profile ? [j.profile.city, j.profile.province].filter(Boolean).join(', ') : null,
          program: prog,
          batch: gradYear,
          employmentStatus: empStatus,
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
    });
  } catch (err) { next(err); }
});

export default router;
