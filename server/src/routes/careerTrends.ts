import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const [employmentRes, educationRes, skillsRes, profilesRes] = await Promise.all([
      supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, start_date, end_date, is_current, salary_range').order('start_date', { ascending: false }),
      supabase.from('education').select('profile_id, program, year_graduated, major'),
      supabase.from('skills').select('profile_id, name, category, proficiency_level'),
      supabase.from('profiles').select('id, current_job_title, company_name, industry, employment_status'),
    ]);

    const employment = employmentRes.data || [];
    const education = educationRes.data || [];
    const skills = skillsRes.data || [];
    const profiles = profilesRes.data || [];

    const totalAlumni = profiles.length;

    const eduMap = new Map<string, { program: string; year: number }[]>();
    education.forEach((e: any) => {
      if (!eduMap.has(e.profile_id)) eduMap.set(e.profile_id, []);
      eduMap.get(e.profile_id)!.push({ program: e.program, year: e.year_graduated });
    });

    const profileSkills = new Map<string, string[]>();
    skills.forEach((s: any) => {
      if (!profileSkills.has(s.profile_id)) profileSkills.set(s.profile_id, []);
      profileSkills.get(s.profile_id)!.push(s.name);
    });

    const employedProfiles = profiles.filter((p: any) => p.employment_status && p.employment_status !== 'Unemployed');
    const profileEmployment = employedProfiles.map((p: any) => ({
      profile_id: p.id,
      company_name: p.company_name || null,
      position: p.current_job_title || 'Unknown',
      company_industry: p.industry || 'Unknown',
      employment_status: p.employment_status?.toLowerCase().replace(/\s+/g, '-') || 'employed',
      is_current: true,
      start_date: null,
      end_date: null,
      salary_range: null,
    }));

    const employedIds = new Set(employment.filter((e: any) => e.is_current).map((e: any) => e.profile_id));
    const mergedEmployment = [
      ...employment,
      ...profileEmployment.filter((p: any) => !employedIds.has(p.profile_id)),
    ];

    const currentJobs = mergedEmployment.filter((e: any) => e.is_current);
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
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (months > 0) career.experienceMonths.push(months);
      }
    });

    const topCareers = Array.from(careerMap.entries())
      .map(([position, data]) => {
        const sortedEmployers = Array.from(data.employers.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const sortedIndustries = Array.from(data.industries.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const sortedCourses = Array.from(data.courses.entries()).sort((a, b) => b[1] - a[1]);
        const sortedSkills = Array.from(data.allSkills.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const avgMonths = data.experienceMonths.length > 0
          ? Math.round(data.experienceMonths.reduce((a, b) => a + b, 0) / data.experienceMonths.length)
          : 0;
        const avgYears = Math.round((avgMonths / 12) * 10) / 10;
        const alumniCount = data.alumni.size;

        return {
          position,
          alumniCount,
          currentInCareer: currentJobs.filter((j: any) => j.position === position).length,
          topEmployers: sortedEmployers.map(([name, count]) => ({ name, count })),
          topIndustries: sortedIndustries.map(([name, count]) => ({ name, count })),
          mostCommonCourse: sortedCourses.length > 0 ? sortedCourses[0][0] : null,
          topSkills: sortedSkills.map(([name, count]) => ({ name, count })),
          averageExperienceYears: avgYears,
        };
      })
      .sort((a, b) => b.alumniCount - a.alumniCount);

    const employerMap = new Map<string, Set<string>>();
    currentJobs.forEach((j: any) => {
      if (!j.company_name || j.company_name === 'Unknown') return;
      if (!employerMap.has(j.company_name)) employerMap.set(j.company_name, new Set());
      employerMap.get(j.company_name)!.add(j.profile_id);
    });
    const topEmployers = Array.from(employerMap.entries())
      .map(([name, alumni]) => ({ name, alumniCount: alumni.size }))
      .sort((a, b) => b.alumniCount - a.alumniCount);

    const industryMap = new Map<string, Set<string>>();
    currentJobs.forEach((j: any) => {
      if (!j.company_industry || j.company_industry === 'Unknown') return;
      if (!industryMap.has(j.company_industry)) industryMap.set(j.company_industry, new Set());
      industryMap.get(j.company_industry)!.add(j.profile_id);
    });
    const totalEmployedCount = currentJobs.length;
    const topIndustries = Array.from(industryMap.entries())
      .map(([name, alumni]) => ({
        name,
        alumniCount: alumni.size,
        percentage: totalEmployedCount > 0 ? Math.round((alumni.size / totalEmployedCount) * 100) : 0,
      }))
      .sort((a, b) => b.alumniCount - a.alumniCount);

    const industryDistribution = topIndustries.slice(0, 10).map((ind) => ({
      name: ind.name,
      value: ind.alumniCount,
      percentage: ind.percentage,
    }));

    const skillCount = new Map<string, number>();
    skills.forEach((s: any) => {
      if (s.name) skillCount.set(s.name, (skillCount.get(s.name) || 0) + 1);
    });
    const topSkills = Array.from(skillCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const batchMap = new Map<number, { total: number; employed: number }>();
    education.forEach((e: any) => {
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
    profiles.forEach((p: any) => {
      const status = p.employment_status || 'Unknown';
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });
    const statusDistribution = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalAlumni > 0 ? Math.round((count / totalAlumni) * 100) : 0,
    }));

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentJobs = mergedEmployment.filter((e: any) => e.start_date && new Date(e.start_date) >= threeMonthsAgo);
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
    mergedEmployment.forEach((e: any) => {
      if (e.start_date) {
        const end = e.end_date ? new Date(e.end_date) : new Date();
        const start = new Date(e.start_date);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (months > 0) allExperienceMonths.push(months);
      }
    });
    const avgOverallExperience = allExperienceMonths.length > 0
      ? Math.round((allExperienceMonths.reduce((a, b) => a + b, 0) / allExperienceMonths.length / 12) * 10) / 10
      : 0;

    res.json({
      overview: {
        totalAlumni,
        totalEmployed,
        employmentRate,
        topCareer: topCareers[0]?.position || 'N/A',
        topIndustry: topIndustries[0]?.name || 'N/A',
        topEmployer: topEmployers[0]?.name || 'N/A',
        topSkill: topSkills[0]?.name || 'N/A',
        averageExperienceYears: avgOverallExperience,
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
    });
  } catch (err) { next(err); }
});

router.get('/:position', authenticate, async (req, res, next) => {
  try {
    const position = decodeURIComponent(req.params.position);
    const { data: employment, error } = await supabase
      .from('employment')
      .select('*, profile:profiles!employment_profile_id_fkey(first_name, last_name, avatar_url, city, province, employment_status)')
      .ilike('position', position);

    if (error) return res.json({ error: error.message });

    const jobs = employment || [];
    const profileIds = [...new Set(jobs.map((j: any) => j.profile_id))];

    const { data: profileFallback } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, company_name, industry, city, province, current_job_title, employment_status')
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
        const m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (m > 0) totalMonths.push(m);
      }
    });
    const avgYears = totalMonths.length > 0
      ? Math.round((totalMonths.reduce((a, b) => a + b, 0) / totalMonths.length / 12) * 10) / 10
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
    const careerOverview = `${position}s are among the most common careers of CTU-Naga alumni. Most alumni in this field work in the ${topIndustryName} industry, primarily at ${topEmployerName}. ${courseNote} ${experienceNote}`.trim();

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
    });
  } catch (err) { next(err); }
});

export default router;
