import { Router } from 'express';
import { supabase } from '../../services/supabase';

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

function alignmentCategory(value: string): string | null {
  const v = String(value || '').toLowerCase().trim();
  if (!v) return null;
  if (v.includes('closely') || v === 'aligned' || v === 'fully aligned') return 'Aligned with Degree';
  if (v.includes('partially') || v.includes('somewhat') || v.includes('moderate')) return 'Partially Aligned';
  if (v.includes('not')) return 'Not Aligned';
  if (v.includes('aligned')) return 'Aligned with Degree';
  return null;
}

function cleanSkillName(raw: string): string {
  let s = String(raw || '').trim();
  if (/years? of experience/i.test(s)) {
    if (/python/i.test(s) && /c\+\+/i.test(s)) return 'Python / C++';
    if (/python/i.test(s)) return 'Python';
    if (/c\+\+/i.test(s)) return 'C++';
    if (/react/i.test(s)) return 'React';
    return s.replace(/^.*(?:in|with)\s+/i, '').trim();
  }
  return s;
}

const SAT_SCORE: Record<string, number> = {
  'Very Satisfied': 5,
  'Satisfied': 4,
  'Neutral': 3,
  'Dissatisfied': 2,
  'Very Dissatisfied': 1,
};

const EMERGING_TECHS = [
  { technology: 'Artificial Intelligence & ML', match: /artificial intelligence|\bai\b|machine learning|deep learning|neural|tensorflow|pytorch|\bnlp\b/i },
  { technology: 'Cloud Computing (AWS/GCP/Azure)', match: /cloud|\baws\b|\bazure\b|google cloud|\bgcp\b|serverless|lambda/i },
  { technology: 'DevOps & Containerization', match: /devops|ci\/cd|docker|kubernetes|container|jenkins|gitlab|terraform/i },
  { technology: 'Modern Databases & SQL', match: /postgresql|postgres|database management|sql|nosql|mongodb|redis/i },
  { technology: 'Cybersecurity & Systems', match: /cyber|security|linux|network admin|penetration|ethical hacking|sysadmin/i },
  { technology: 'Full-Stack Web & Mobile', match: /react|node\.?js|typescript|frontend|backend|full.?stack|mobile|figma/i },
  { technology: 'Data Analytics & Visualization', match: /data analytics|data analysis|big data|power bi|tableau|data science|visualization/i },
];

const REC_TEXTS: Record<string, string> = {
  'cloud computing': 'Strengthen cloud architecture coursework (AWS/GCP/Azure) and introduce hands-on cloud deployment labs.',
  'cloud': 'Strengthen cloud architecture coursework (AWS/GCP/Azure) and introduce hands-on cloud deployment labs.',
  'docker': 'Introduce containerization (Docker, Kubernetes) and CI/CD automation into software development electives.',
  'kubernetes': 'Add container orchestration, cloud-native deployments, and microservices labs.',
  'postgresql': 'Deepen relational database curriculum with hands-on PostgreSQL, indexing, query optimization, and schema migrations.',
  'database management': 'Strengthen database administration, SQL optimization, and database security coursework.',
  'linux': 'Incorporate Linux system administration, bash scripting, and server configuration into the systems track.',
  'network administration': 'Strengthen networking laboratories with router/switch configuration, VPN, and network security monitoring.',
  'technical support': 'Introduce practical IT service management, troubleshooting labs, and customer support frameworks.',
  'cybersecurity': 'Introduce additional cybersecurity electives and embed secure coding practices across courses.',
  'data analytics': 'Increase practical data analysis activities using real-world datasets and modern SQL/Python tooling.',
  'artificial intelligence': 'Introduce or expand AI/ML coursework, prompt engineering, and applied automation projects.',
  'machine learning': 'Introduce or expand machine learning coursework and data engineering projects.',
  'devops': 'Add DevOps, containerization, automated testing, and CI/CD topics to software engineering courses.',
  'social media marketing': 'Offer elective workshops on digital media marketing, audience analytics, and online content strategy.',
  'content creation': 'Incorporate digital media production, brand communication, and modern creative workflows.',
  'inventory management': 'Offer coursework in enterprise resource planning, logistics management, and automated inventory systems.',
  'python / c++': 'Emphasize high-performance algorithms, system programming, and modern software design patterns.',
  'python': 'Expand advanced Python applications in data science, automation, and backend API engineering.',
  'typescript': 'Adopt TypeScript across modern web and full-stack development coursework.',
  'react': 'Reinforce modern frontend web development with React, component design, and state management.',
  'node.js': 'Emphasize RESTful API design, microservices, and asynchronous event-driven backend development.',
};

const FEEDBACK_THEMES = [
  { theme: 'More hands-on laboratory work', match: /hand.?on|laborator|\blab\b|practical session/i },
  { theme: 'Increase internship opportunities', match: /intern|oij|practicum/i },
  { theme: 'More industry certifications (TESDA, Cloud)', match: /certific|license|tesda|nc\s?ii/i },
  { theme: 'More cloud computing & DevOps topics', match: /cloud|docker|devops/i },
  { theme: 'More real-world capstone projects', match: /real.world|capstone|\bproject/i },
  { theme: 'Increase industry collaboration & job fairs', match: /industry|partner|collaborat|job fair|career talk/i },
  { theme: 'More programming & software skills', match: /program|coding|software|develop|\bcode\b|python|javascript/i },
  { theme: 'Improve soft skills & interview readiness', match: /communic|teamwork|soft skill|presentation|leadership|interview/i },
];

function toRanked(obj: Record<string, number>) {
  return Object.entries(obj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function classifyAlignment(
  mergedResp: any,
  eduPrograms: string[],
  currentEmp: any[],
  profileJob?: string,
  profileIndustry?: string
): 'Aligned with Degree' | 'Partially Aligned' | 'Not Aligned' {
  // 1. Direct survey course_alignment
  const ca = alignmentCategory(mergedResp.course_alignment);
  if (ca) return ca as any;

  // 2. Direct survey curriculumRelevance / curriculum_relevance
  const cr = String(mergedResp.curriculumRelevance || mergedResp.curriculum_relevance || '').toLowerCase().trim();
  if (cr.includes('extremely') || cr.includes('very')) return 'Aligned with Degree';
  if (cr.includes('moderate') || cr.includes('somewhat')) return 'Partially Aligned';
  if (cr.includes('slightly') || cr.includes('not')) return 'Not Aligned';

  // 3. Program vs actual position / industry
  const programStr = (eduPrograms.join(' ') + ' ' + (mergedResp.program || '')).toLowerCase();
  const jobTitle = [
    ...currentEmp.map((e) => e.position || ''),
    profileJob || '',
    mergedResp.position || '',
    mergedResp.currentJobTitle || '',
  ].join(' ').toLowerCase();

  const industry = [
    ...currentEmp.map((e) => e.company_industry || ''),
    profileIndustry || '',
    mergedResp.industry || '',
  ].join(' ').toLowerCase();

  const isIT = programStr.includes('it') || programStr.includes('information') || programStr.includes('computer');
  const isEducation = programStr.includes('education') || programStr.includes('bsed') || programStr.includes('beed') || programStr.includes('teach');

  if (isIT) {
    if (
      /software|developer|engineer|programmer|web|systems?|database|network|cloud|tech|devops|full.?stack|analyst|code|coding/i.test(jobTitle) ||
      /information technology|\bit\b|software|technology/i.test(industry)
    ) {
      return 'Aligned with Degree';
    }
    if (/support|help.?desk|technical|technician|specialist|operations|assistant/i.test(jobTitle)) {
      return 'Partially Aligned';
    }
    if (jobTitle.trim() && !/unemployed/i.test(jobTitle)) {
      return 'Not Aligned';
    }
  } else if (isEducation) {
    if (/teacher|instructor|educator|professor|faculty|tutor|teaching/i.test(jobTitle) || /education|school|college|academic/i.test(industry)) {
      return 'Aligned with Degree';
    }
    if (/coordinator|librarian|adviser|counselor/i.test(jobTitle)) {
      return 'Partially Aligned';
    }
    if (jobTitle.trim() && !/unemployed/i.test(jobTitle)) {
      return 'Not Aligned';
    }
  }

  return 'Partially Aligned';
}

const router = Router();

router.get('/statistics', async (req, res, next) => {
  try {
    const academicYear = req.query.academic_year as string;
    const batch = req.query.batch as string;
    const course = req.query.course as string;
    const industryFilter = req.query.industry as string;
    const statusFilter = req.query.employment_status as string;
    const alignmentFilter = req.query.work_alignment as string;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    // 1. Fetch alumni users
    const { data: users } = await supabase.from('users').select('id, email').eq('role', 'alumni');
    const alumniUsers = users || [];
    const alumniUserIds = alumniUsers.map((u: any) => u.id);

    // 2. Fetch profiles
    let profiles: any[] = [];
    if (alumniUserIds.length > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, employment_status, current_job_title, company_name, industry, city, province')
        .in('user_id', alumniUserIds);
      profiles = p || [];
    }

    const profileIds = profiles.map((p: any) => p.id);
    let education: any[] = [];
    let employment: any[] = [];
    let skills: any[] = [];
    if (profileIds.length > 0) {
      const [{ data: e }, { data: emp }, { data: sk }] = await Promise.all([
        supabase.from('education').select('profile_id, program, year_graduated, campus').in('profile_id', profileIds),
        supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, job_type, start_date, end_date, is_current, updated_at').in('profile_id', profileIds),
        supabase.from('skills').select('profile_id, name, category, proficiency_level').in('profile_id', profileIds),
      ]);
      education = e || [];
      employment = emp || [];
      skills = sk || [];
    }

    // 3. Fetch real job postings (market demand)
    const { data: jp } = await supabase
      .from('job_postings')
      .select('id, position, company_name, industry, required_skills, requirements, description');
    const jobPostings = jp || [];

    // 4. Fetch career feedback (if present)
    let careerFeedback: any[] = [];
    if (profileIds.length > 0) {
      const { data: cf } = await supabase
        .from('career_feedback')
        .select('profile_id, skills_used_at_work, suggested_skills, suggested_subjects, recommend_changes, degree_relevance, curriculum_preparation')
        .in('profile_id', profileIds);
      careerFeedback = cf || [];
    }

    // 5. Fetch surveys and survey responses
    const { data: surveys } = await supabase.from('surveys').select('id, academic_year, status, is_active');
    const { data: surveyResponses } = await supabase
      .from('survey_responses')
      .select('survey_id, user_id, responses, submitted_at')
      .order('submitted_at', { ascending: true });

    // Lookup maps
    const eduByProfile = new Map<string, any[]>();
    education.forEach((e: any) => {
      if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
      eduByProfile.get(e.profile_id)!.push(e);
    });

    const empByProfile = new Map<string, any[]>();
    employment.forEach((e: any) => {
      if (!empByProfile.has(e.profile_id)) empByProfile.set(e.profile_id, []);
      empByProfile.get(e.profile_id)!.push(e);
    });

    const feedbackByProfile = new Map<string, any>();
    careerFeedback.forEach((c: any) => feedbackByProfile.set(c.profile_id, c));

    // Consolidate survey responses per user
    const allResponsesByUser = new Map<string, any[]>();
    (surveyResponses || []).forEach((r: any) => {
      if (!allResponsesByUser.has(r.user_id)) allResponsesByUser.set(r.user_id, []);
      allResponsesByUser.get(r.user_id)!.push(r.responses || {});
    });

    const getMergedUserResponse = (userId: string, email?: string) => {
      let list = allResponsesByUser.get(userId) || [];
      if (list.length === 0 && email) {
        list = (surveyResponses || [])
          .filter((sr: any) => (sr.responses?.email || '').toLowerCase() === email.toLowerCase())
          .map((sr: any) => sr.responses || {});
      }
      return Object.assign({}, ...list);
    };

    const academicYears = [...new Set((surveys || []).map((s: any) => s.academic_year).filter(Boolean))].sort();
    const academicYearUserIds = new Set<string>();
    if (academicYear) {
      const matchingSurveys = (surveys || []).filter((s: any) => s.academic_year === academicYear).map((s: any) => s.id);
      const ids = new Set(matchingSurveys);
      (surveyResponses || []).forEach((r: any) => {
        if (ids.has(r.survey_id)) academicYearUserIds.add(r.user_id);
      });
    }

    const isCurrent = (e: any) => e.is_current === true;
    const employmentStatusOf = (p: any, mergedResp: any) => {
      const raw =
        p.employment_status ||
        (empByProfile.get(p.id) || []).find(isCurrent)?.employment_status ||
        mergedResp.employmentStatus ||
        mergedResp.employment_status ||
        null;
      const lower = String(raw || '').toLowerCase();
      if (raw === 'Employed' || lower === 'employed') return 'Employed';
      if (lower === 'self-employed' || lower === 'entrepreneur') return 'Self-employed';
      if (lower === 'student' || lower.includes('further studies')) return 'Pursuing Further Studies';
      return 'Unemployed';
    };

    // Filter eligible profiles
    const eligibleProfiles = profiles.filter((p: any) => {
      if (academicYear && !academicYearUserIds.has(p.user_id)) return false;
      const edu = eduByProfile.get(p.id) || [];
      if (batch && !edu.some((e: any) => String(e.year_graduated) === batch)) return false;
      if (course && !edu.some((e: any) => abbreviateProgram(e.program) === course)) return false;

      const mergedResp = getMergedUserResponse(p.user_id, p.email);
      const status = employmentStatusOf(p, mergedResp);
      if (statusFilter && status !== statusFilter) return false;

      const currentEmp = (empByProfile.get(p.id) || []).filter(isCurrent);
      const eduPrograms = edu.map((e: any) => e.program || '');
      const alignment = classifyAlignment(mergedResp, eduPrograms, currentEmp, p.current_job_title, p.industry);
      if (alignmentFilter && alignment !== alignmentFilter) return false;

      if (industryFilter) {
        const industries = currentEmp
          .map((e: any) => String(e.company_industry || '').trim())
          .concat(p.industry || '', mergedResp.industry || '');
        if (!industries.some((i: any) => i === industryFilter)) return false;
      }

      if (dateFrom || dateTo) {
        const dates = currentEmp.map((e: any) => e.start_date || e.updated_at).filter(Boolean);
        const inRange = dates.some((d: any) => {
          const t = new Date(d).getTime();
          if (dateFrom && t < new Date(dateFrom).getTime()) return false;
          if (dateTo && t > new Date(dateTo + 'T23:59:59').getTime()) return false;
          return true;
        });
        if (!inRange) return false;
      }
      return true;
    });

    const totalAlumni = eligibleProfiles.length;
    const eligibleIds = new Set(eligibleProfiles.map((p: any) => p.id));
    const eligibleEmployment = employment.filter((e: any) => eligibleIds.has(e.profile_id));
    const eligibleSkills = skills.filter((s: any) => eligibleIds.has(s.profile_id));

    // --- Degree Alignment ---
    const alignmentCounts: Record<string, number> = { 'Aligned with Degree': 0, 'Partially Aligned': 0, 'Not Aligned': 0 };
    let alignmentTotal = 0;
    eligibleProfiles.forEach((p: any) => {
      const mergedResp = getMergedUserResponse(p.user_id, p.email);
      const edu = eduByProfile.get(p.id) || [];
      const currentEmp = (empByProfile.get(p.id) || []).filter(isCurrent);
      const eduPrograms = edu.map((e: any) => e.program || '');
      const status = employmentStatusOf(p, mergedResp);

      // Only count alumni who are employed or who provided survey feedback
      const hasJob = currentEmp.length > 0 || p.current_job_title || mergedResp.position;
      if (status !== 'Unemployed' || hasJob || mergedResp.curriculumRelevance || mergedResp.course_alignment) {
        const cat = classifyAlignment(mergedResp, eduPrograms, currentEmp, p.current_job_title, p.industry);
        alignmentCounts[cat] = (alignmentCounts[cat] || 0) + 1;
        alignmentTotal++;
      }
    });

    const workAlignmentRate = alignmentTotal > 0
      ? Math.round(((alignmentCounts['Aligned with Degree'] + alignmentCounts['Partially Aligned']) / alignmentTotal) * 100)
      : 0;

    const degreeAlignment = Object.entries(alignmentCounts)
      .filter(([, c]) => c > 0)
      .map(([category, count]) => ({
        category,
        count,
        percentage: alignmentTotal > 0 ? Math.round((count / alignmentTotal) * 100) : 0,
      }));

    // --- Average Graduate Satisfaction ---
    let satisfactionSum = 0;
    let satisfactionCount = 0;
    eligibleProfiles.forEach((p: any) => {
      const resp = getMergedUserResponse(p.user_id, p.email);
      const scores: number[] = [];

      if (resp.satisfaction_rating && SAT_SCORE[resp.satisfaction_rating]) {
        scores.push(SAT_SCORE[resp.satisfaction_rating]);
      }
      ['facultyRating', 'facilitiesRating', 'studentServicesRating'].forEach((k) => {
        const v = parseFloat(String(resp[k] || ''));
        if (!isNaN(v) && v >= 1 && v <= 5) scores.push(v);
      });
      const cr = String(resp.curriculumRelevance || resp.curriculum_relevance || '').toLowerCase();
      if (cr.includes('extremely')) scores.push(5);
      else if (cr.includes('very')) scores.push(4.5);
      else if (cr.includes('moderate')) scores.push(3.5);
      else if (cr.includes('slightly')) scores.push(2);

      if (scores.length > 0) {
        const userAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        satisfactionSum += userAvg;
        satisfactionCount++;
      }
    });
    const averageSatisfaction = satisfactionCount > 0 ? Math.round((satisfactionSum / satisfactionCount) * 10) / 10 : null;

    // --- Average Time to Employment ---
    const firstJobByProfile = new Map<string, string>();
    eligibleEmployment.forEach((e: any) => {
      if (isCurrent(e) && e.start_date && (!firstJobByProfile.has(e.profile_id) || e.start_date < firstJobByProfile.get(e.profile_id)!)) {
        firstJobByProfile.set(e.profile_id, e.start_date);
      }
    });
    const monthsToEmployment: number[] = [];
    firstJobByProfile.forEach((startDate, profileId) => {
      const edu = eduByProfile.get(profileId) || [];
      const gradYear = edu.map((e: any) => Number(e.year_graduated)).filter((y: number) => !isNaN(y)).sort().pop();
      if (!gradYear) return;
      const gradDate = new Date(gradYear, 5, 1);
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return;
      const months = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
      if (months >= 0) monthsToEmployment.push(months);
    });
    const averageTimeToEmployment = monthsToEmployment.length > 0
      ? Math.round(monthsToEmployment.reduce((a, b) => a + b, 0) / monthsToEmployment.length)
      : null;

    // --- Skills Frequently Used ---
    // Merge: alumni skills + survey reported competencies + real employer job postings
    const skillCount: Record<string, number> = {};
    eligibleSkills.forEach((s: any) => {
      const name = cleanSkillName(s.name);
      if (name) skillCount[name] = (skillCount[name] || 0) + 1;
    });

    eligibleProfiles.forEach((p: any) => {
      const resp = getMergedUserResponse(p.user_id, p.email);
      if (resp.skills_list) {
        String(resp.skills_list)
          .split(/[,;\n]+/)
          .map((s) => cleanSkillName(s))
          .filter(Boolean)
          .forEach((s) => {
            skillCount[s] = (skillCount[s] || 0) + 1;
          });
      }
    });

    careerFeedback.forEach((c: any) => {
      if (!eligibleIds.has(c.profile_id)) return;
      (c.skills_used_at_work || []).forEach((name: string) => {
        const n = cleanSkillName(name);
        if (n) skillCount[n] = (skillCount[n] || 0) + 1;
      });
    });

    // Also include skills demanded in active employer postings
    jobPostings.forEach((j: any) => {
      (j.required_skills || []).forEach((name: string) => {
        const n = cleanSkillName(name);
        if (n) skillCount[n] = (skillCount[n] || 0) + 1;
      });
    });

    const skillsFrequentlyUsed = toRanked(skillCount)
      .map((s) => ({
        name: s.name,
        count: s.count,
        percentage: totalAlumni > 0 ? Math.min(100, Math.round((s.count / Math.max(totalAlumni, 1)) * 100)) : 0,
      }))
      .slice(0, 12);

    // --- Emerging Technologies ---
    const allTechStrings: string[] = [];
    eligibleSkills.forEach((s: any) => allTechStrings.push(s.name || ''));
    eligibleProfiles.forEach((p: any) => {
      const resp = getMergedUserResponse(p.user_id, p.email);
      if (resp.skills_list) allTechStrings.push(resp.skills_list);
      if (resp.postGradCertifications) allTechStrings.push(resp.postGradCertifications);
      (resp.competenciesDeveloped || []).forEach((c: string) => allTechStrings.push(c));
    });
    jobPostings.forEach((j: any) => {
      (j.required_skills || []).forEach((s: string) => allTechStrings.push(s));
      (j.requirements || []).forEach((r: string) => allTechStrings.push(r));
      if (j.position) allTechStrings.push(j.position);
      if (j.description) allTechStrings.push(j.description);
    });

    const combinedTechCorpus = allTechStrings.join(' ');
    const emergingTechnologies = EMERGING_TECHS.map((tech) => {
      let count = 0;
      allTechStrings.forEach((str) => {
        if (tech.match.test(str)) count++;
      });
      // Also check occurrences in active employer job postings
      const jobHits = jobPostings.filter((j: any) => {
        const text = `${j.position || ''} ${(j.required_skills || []).join(' ')} ${(j.requirements || []).join(' ')}`;
        return tech.match.test(text);
      }).length;

      let growth = 'Stable';
      if (jobHits >= 2) growth = 'Trending Up';
      else if (jobHits === 1) growth = 'New';
      else if (count >= 3) growth = 'Trending Up';

      return { technology: tech.technology, count: Math.max(count, jobHits), growth };
    }).filter((t) => t.count > 0);

    // --- Skills Gap Analysis (Real Market Demand vs Alumni Curriculum Coverage) ---
    const marketDemand: Record<string, number> = {};
    jobPostings.forEach((j: any) => {
      (j.required_skills || []).forEach((name: string) => {
        const n = cleanSkillName(name);
        if (n) marketDemand[n] = (marketDemand[n] || 0) + 1;
      });
    });

    const curriculumCoverage: Record<string, number> = {};
    eligibleSkills.forEach((s: any) => {
      const n = cleanSkillName(s.name);
      if (n) curriculumCoverage[n] = (curriculumCoverage[n] || 0) + 1;
    });
    eligibleProfiles.forEach((p: any) => {
      const resp = getMergedUserResponse(p.user_id, p.email);
      if (resp.skills_list) {
        String(resp.skills_list)
          .split(/[,;\n]+/)
          .map((s) => cleanSkillName(s))
          .filter(Boolean)
          .forEach((s) => {
            curriculumCoverage[s] = (curriculumCoverage[s] || 0) + 1;
          });
      }
    });

    // Compute gaps where market demand exceeds coverage or where employers require emerging tech
    const skillsGap = Object.entries(marketDemand)
      .map(([skill, demand]) => {
        const coverage = curriculumCoverage[skill] || 0;
        const gap = Math.max(0, demand - coverage);
        return {
          skill,
          workplaceUsage: demand,
          curriculumCoverage: coverage,
          gap,
        };
      })
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 6)
      .map((g) => ({
        skill: g.skill,
        workplaceUsage: g.workplaceUsage,
        curriculumCoverage: g.curriculumCoverage,
        gap: g.gap,
        recommendation:
          REC_TEXTS[normalize(g.skill)] ||
          `Consider integrating ${g.skill} more deeply into the program curriculum through laboratory exercises and capstone projects.`,
      }));

    // --- Curriculum Recommendation Cards ---
    const candidates = [
      ...skillsGap.map((g) => ({
        title: g.skill,
        count: g.workplaceUsage,
        kind: 'gap' as const,
        gap: g.gap,
        coverage: g.curriculumCoverage,
      })),
      ...emergingTechnologies.map((t) => ({
        title: t.technology,
        count: t.count,
        kind: 'technology' as const,
        gap: 0,
        coverage: 0,
      })),
    ];

    const maxCount = Math.max(1, ...candidates.map((c) => c.count));
    const recommendations = candidates
      .slice(0, 4)
      .map((c) => {
        const priority = c.count >= 2 ? 'High' : c.count >= 1 ? 'Medium' : 'Low';
        const supportingData =
          c.kind === 'gap'
            ? `Required in ${c.count} active industry job posting(s), but only ${c.coverage} alumni reported receiving coursework training in this area.`
            : `Identified across ${c.count} industry job openings and recent graduate tech stacks with ${c.title}.`;
        const suggestedImprovement =
          REC_TEXTS[normalize(c.title)] ||
          `Embed hands-on projects, industry certifications, and elective laboratory modules focusing on ${c.title}.`;
        return { title: c.title, priority, supportingData, suggestedImprovement };
      });

    // --- Common Career Paths ---
    const careerCount: Record<string, number> = {};
    const mergedEmployment = [...eligibleEmployment];
    eligibleProfiles.forEach((p: any) => {
      const resp = getMergedUserResponse(p.user_id, p.email);
      const hasRecord = mergedEmployment.some((e: any) => e.profile_id === p.id);
      if (!hasRecord && (p.current_job_title || resp.position || resp.currentJobTitle)) {
        mergedEmployment.push({
          profile_id: p.id,
          position: p.current_job_title || resp.position || resp.currentJobTitle,
          company_name: p.company_name || resp.company_name || resp.companyName,
          company_industry: p.industry || resp.industry,
          is_current: true,
        });
      }
    });

    mergedEmployment.forEach((e: any) => {
      if (!e.position) return;
      const pos = String(e.position).trim();
      if (pos) careerCount[pos] = (careerCount[pos] || 0) + 1;
    });

    const careerPaths = Object.entries(careerCount)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Industry Alignment ---
    const industryCount: Record<string, number> = {};
    eligibleProfiles.forEach((p: any) => {
      const emp = empByProfile.get(p.id) || [];
      const resp = getMergedUserResponse(p.user_id, p.email);
      const ind = String(
        (emp.find(isCurrent)?.company_industry || p.industry || resp.industry) || ''
      ).trim();
      if (ind) {
        industryCount[ind] = (industryCount[ind] || 0) + 1;
      }
    });

    const industryAlignment = toRanked(industryCount)
      .map((i) => ({
        industry: i.name,
        count: i.count,
        percentage: totalAlumni > 0 ? Math.round((i.count / totalAlumni) * 100) : 0,
      }))
      .slice(0, 10);

    // --- Graduate Feedback Summary ---
    const themeHits: Record<string, { count: number; example: string | null }> = {};
    const seenUserTheme = new Set<string>();
    eligibleProfiles.forEach((p: any) => {
      const resp = getMergedUserResponse(p.user_id, p.email);
      const suggestion = String(resp.suggestions || '').trim();
      const reasons = Array.isArray(resp.reasonsForEnrolling) ? resp.reasonsForEnrolling.join(' ') : '';
      const certs = String(resp.postGradCertifications || '');
      const prefs = Array.isArray(resp.engagementPreferences) ? resp.engagementPreferences.join(' ') : '';
      const text = `${suggestion} ${reasons} ${certs} ${prefs}`;
      if (!text.trim()) return;

      FEEDBACK_THEMES.forEach((t) => {
        if (!t.match.test(text)) return;
        const key = `${p.user_id}:${t.theme}`;
        if (seenUserTheme.has(key)) return;
        seenUserTheme.add(key);
        if (!themeHits[t.theme]) themeHits[t.theme] = { count: 0, example: null };
        themeHits[t.theme].count++;
        if (!themeHits[t.theme].example && suggestion && suggestion !== 'nothing') {
          themeHits[t.theme].example = suggestion.length > 90 ? `${suggestion.slice(0, 90)}…` : suggestion;
        }
      });
    });

    const feedbackThemes = Object.entries(themeHits)
      .map(([theme, v]) => ({ theme, count: v.count, example: v.example }))
      .sort((a, b) => b.count - a.count);

    // --- Suggested Curriculum Actions ---
    const recHigh = recommendations.filter((r) => r.priority === 'High').map((r) => r.title);
    const recMedium = recommendations.filter((r) => r.priority === 'Medium').map((r) => r.title);
    const recLow = recommendations.filter((r) => r.priority === 'Low').map((r) => r.title);

    let actions: { high: string[]; medium: string[]; low: string[] };
    if (recHigh.length || recMedium.length) {
      actions = {
        high: recHigh.length > 0 ? recHigh : ['Strengthen hands-on technical labs with industry-aligned tools'],
        medium: recMedium.length > 0 ? recMedium : ['Expand elective course offerings in specialized technologies'],
        low: recLow.length > 0 ? recLow : ['Facilitate alumni-led workshops and career coaching sessions'],
      };
    } else {
      const themeTitles = feedbackThemes.map((t) => t.theme);
      actions = {
        high: themeTitles.slice(0, 1),
        medium: themeTitles.slice(1, 3),
        low: themeTitles.slice(3, 6),
      };
    }

    const industries = [...new Set(
      employment
        .map((e: any) => String(e.company_industry || '').trim())
        .concat(profiles.map((p: any) => String(p.industry || '').trim()))
        .concat(jobPostings.map((j: any) => String(j.industry || '').trim()))
    )].filter(Boolean).sort();

    res.json({
      overview: {
        totalAlumni,
        workAlignmentRate,
        averageTimeToEmployment,
        averageSatisfaction,
        skillsIdentified: Object.keys(skillCount).length,
        emergingTechnologies: emergingTechnologies.length,
        recommendationsGenerated: recommendations.length,
      },
      degreeAlignment,
      skillsFrequentlyUsed,
      emergingTechnologies,
      skillsGap,
      recommendations,
      careerPaths,
      industryAlignment,
      feedbackThemes,
      actions,
      filters: {
        academicYears,
        batches: [...new Set(education.map((e: any) => e.year_graduated).filter(Boolean))].sort((a: any, b: any) => b - a),
        programs: [...new Set(education.map((e: any) => abbreviateProgram(e.program)).filter(Boolean))].sort(),
        industries,
        employmentStatuses: ['Employed', 'Self-employed', 'Unemployed', 'Pursuing Further Studies'],
        workAlignmentOptions: ['Aligned with Degree', 'Partially Aligned', 'Not Aligned'],
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
