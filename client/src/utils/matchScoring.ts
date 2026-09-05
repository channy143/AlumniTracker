/**
 * Shared Match-Scoring Logic for Contour Job Posting & Application System.
 * Used identically across Alumni Career Opportunities and Admin Applicant Screening.
 */

export interface MatchScoringWeights {
  skills: number;
  experience: number;
  education: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchScoringWeights = {
  skills: 0.50,
  experience: 0.30,
  education: 0.20,
};

export interface SkillItem {
  name: string;
  proficiency_level?: number;
  category?: string | null;
}

export interface EmploymentItem {
  position?: string;
  company_name?: string;
  start_date?: string;
  end_date?: string | null;
  is_current?: boolean;
}

export interface EducationItem {
  program?: string;
  major?: string | null;
  year_graduated?: number | null;
}

export interface AlumniProfileData {
  skills?: (string | SkillItem)[];
  employment?: EmploymentItem[];
  education?: EducationItem[];
  totalExperienceYears?: number;
}

export interface JobRequirementsData {
  required_skills?: string[];
  experience_level?: string | null;
  position?: string;
  industry?: string | null;
  description?: string | null;
}

export interface SkillMatchDetail {
  skill: string;
  status: 'full' | 'partial' | 'missing';
  alumniSkillName?: string;
  proficiencyLevel?: number;
}

export interface MatchScoreBreakdown {
  skills_score: number;
  experience_score: number;
  education_score: number;
  overall_score: number;
  skills_breakdown: SkillMatchDetail[];
}

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[._\-+/\\&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates skills match score (0-100) and breakdown for each required skill.
 */
export function calculateSkillsMatch(
  requiredSkills: string[] = [],
  alumniSkills: (string | SkillItem)[] = []
): { score: number; breakdown: SkillMatchDetail[] } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { score: 100, breakdown: [] };
  }

  const parsedAlumniSkills: { name: string; norm: string; level: number }[] = (alumniSkills || []).map((s) => {
    if (typeof s === 'string') {
      return { name: s, norm: normalize(s), level: 3 };
    }
    return { name: s.name || '', norm: normalize(s.name || ''), level: s.proficiency_level ?? 3 };
  });

  let totalCredit = 0;
  const breakdown: SkillMatchDetail[] = [];

  for (const req of requiredSkills) {
    const normReq = normalize(req);
    if (!normReq) continue;

    // 1. Check exact match
    const exact = parsedAlumniSkills.find((as) => as.norm === normReq);
    if (exact) {
      // Full credit if level >= 3, partial (0.7) if beginner (1-2)
      const credit = exact.level >= 3 ? 1.0 : 0.7;
      totalCredit += credit;
      breakdown.push({
        skill: req,
        status: exact.level >= 3 ? 'full' : 'partial',
        alumniSkillName: exact.name,
        proficiencyLevel: exact.level,
      });
      continue;
    }

    // 2. Check fuzzy / substring match
    const fuzzy = parsedAlumniSkills.find(
      (as) => as.norm.includes(normReq) || normReq.includes(as.norm)
    );
    if (fuzzy) {
      totalCredit += 0.8;
      breakdown.push({
        skill: req,
        status: 'partial',
        alumniSkillName: fuzzy.name,
        proficiencyLevel: fuzzy.level,
      });
      continue;
    }

    // 3. Missing
    breakdown.push({
      skill: req,
      status: 'missing',
    });
  }

  const score = Math.min(100, Math.max(0, Math.round((totalCredit / Math.max(1, requiredSkills.length)) * 100)));
  return { score, breakdown };
}

/**
 * Calculates experience match score (0-100) based on required experience level.
 */
export function calculateExperienceMatch(
  experienceLevel: string | null | undefined,
  employment: EmploymentItem[] = [],
  explicitYears?: number
): number {
  const levelRequirements: Record<string, number> = {
    entry: 0.5,
    junior: 1.5,
    mid: 3.0,
    senior: 5.0,
    lead: 7.0,
    executive: 10.0,
  };

  const key = (experienceLevel || 'entry').toLowerCase().trim();
  const requiredYears = levelRequirements[key] ?? 1.0;

  let alumniYears = 0;
  if (typeof explicitYears === 'number' && !isNaN(explicitYears)) {
    alumniYears = explicitYears;
  } else if (employment && employment.length > 0) {
    let totalDays = 0;
    const now = Date.now();
    for (const job of employment) {
      if (!job.start_date) continue;
      const start = new Date(job.start_date).getTime();
      if (isNaN(start)) continue;
      const end = job.end_date ? new Date(job.end_date).getTime() : now;
      const diff = Math.max(0, (isNaN(end) ? now : end) - start);
      totalDays += diff / 86400000;
    }
    alumniYears = totalDays / 365.25;
  }

  if (requiredYears <= 0.5 && alumniYears >= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round((alumniYears / requiredYears) * 100)));
}

/**
 * Calculates education match score (0-100) comparing program/degree to job position/industry.
 */
export function calculateEducationMatch(
  jobPosition: string = '',
  jobIndustry: string = '',
  education: EducationItem[] = []
): number {
  if (!education || education.length === 0) {
    return 30; // No education records recorded
  }

  const posAndInd = normalize(`${jobPosition} ${jobIndustry}`);

  const itKeywords = ['software', 'developer', 'engineer', 'tech', 'web', 'data', 'it', 'programmer', 'frontend', 'backend', 'full stack', 'qa', 'analyst', 'cybersecurity', 'system'];
  const isTechJob = itKeywords.some((kw) => posAndInd.includes(kw));

  for (const edu of education) {
    const prog = normalize(`${edu.program || ''} ${edu.major || ''}`);

    if (isTechJob && (prog.includes('information technology') || prog.includes('computer science') || prog.includes('bsit') || prog.includes('bscs') || prog.includes('bit'))) {
      return 100;
    }

    if (posAndInd.includes('engineer') && prog.includes('engineering')) {
      return 100;
    }

    if (posAndInd.includes('teach') && (prog.includes('education') || prog.includes('bseid') || prog.includes('btled'))) {
      return 100;
    }
  }

  // Any tertiary degree from CTU-Naga
  const hasDegree = education.some((e) => e.year_graduated || e.program);
  if (hasDegree) {
    return isTechJob ? 75 : 85;
  }

  return 60;
}

/**
 * Shared function calculating complete 4-tier match score:
 * Skills (50%) + Experience (30%) + Education (20%) = Overall (100%).
 */
export function calculateMatchScore(
  job: JobRequirementsData,
  alumni: AlumniProfileData,
  weights: MatchScoringWeights = DEFAULT_MATCH_WEIGHTS
): MatchScoreBreakdown {
  const { score: skillsScore, breakdown } = calculateSkillsMatch(job.required_skills, alumni.skills);
  const experienceScore = calculateExperienceMatch(job.experience_level, alumni.employment, alumni.totalExperienceYears);
  const educationScore = calculateEducationMatch(job.position || '', job.industry || '', alumni.education);

  const overallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        skillsScore * weights.skills +
        experienceScore * weights.experience +
        educationScore * weights.education
      )
    )
  );

  return {
    skills_score: skillsScore,
    experience_score: experienceScore,
    education_score: educationScore,
    overall_score: overallScore,
    skills_breakdown: breakdown,
  };
}
