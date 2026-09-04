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
  if (v.includes('partially') || v.includes('somewhat')) return 'Partially Aligned';
  if (v.includes('not')) return 'Not Aligned';
  if (v.includes('aligned')) return 'Aligned with Degree';
  return null;
}

const SAT_SCORE: Record<string, number> = {
  'Very Satisfied': 5,
  'Satisfied': 4,
  'Neutral': 3,
  'Dissatisfied': 2,
  'Very Dissatisfied': 1,
};

const EMERGING_TECHS = [
  { technology: 'Artificial Intelligence', match: /artificial intelligence|\bai\b|machine learning|deep learning|neural|tensorflow|pytorch|\bnlp\b/i },
  { technology: 'Cloud Computing', match: /cloud|\baws\b|\bazure\b|google cloud|\bgcp\b|serverless|lambda/i },
  { technology: 'Cybersecurity', match: /cyber|security|penetration|ethical hacking|network security|encryption/i },
  { technology: 'Data Analytics', match: /data analytics|data analysis|big data|power bi|tableau|data science|visualization/i },
  { technology: 'Machine Learning', match: /machine learning|\bml\b|deep learning|tensorflow|pytorch|scikit/i },
  { technology: 'DevOps', match: /devops|ci\/cd|docker|kubernetes|jenkins|gitlab|terraform/i },
];

const REC_TEXTS: Record<string, string> = {
  'cloud computing': 'Strengthen cloud-related coursework and add hands-on cloud laboratory activities.',
  'cloud': 'Strengthen cloud-related coursework and add hands-on cloud laboratory activities.',
  'cybersecurity': 'Introduce additional cybersecurity electives and embed security fundamentals across courses.',
  'data analytics': 'Increase practical data analysis activities using real-world datasets.',
  'artificial intelligence': 'Introduce or expand AI/ML coursework and applied projects.',
  'machine learning': 'Introduce or expand machine learning coursework and projects.',
  'devops': 'Consider adding DevOps, containerization, and CI/CD topics to software courses.',
};

const FEEDBACK_THEMES = [
  { theme: 'More hands-on laboratory work', match: /hand.?on|laborator|\blab\b|practical session/i },
  { theme: 'Increase internship opportunities', match: /intern/i },
  { theme: 'More industry certifications', match: /certific|license/i },
  { theme: 'More cloud computing topics', match: /cloud/i },
  { theme: 'More real-world projects', match: /real.world|capstone|\bproject/i },
  { theme: 'Increase industry collaboration', match: /industry|partner|collaborat|with companies/i },
  { theme: 'More programming and software skills', match: /program|coding|software|develop|\bcode\b/i },
  { theme: 'Improve soft skills training', match: /communic|teamwork|soft skill|presentation|leadership/i },
];

function topKey(counts: Record<string, number>): string | null {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function toRanked(obj: Record<string, number>) {
  return Object.entries(obj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
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

    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');
    const alumniUsers = users || [];
    const alumniUserIds = alumniUsers.map((u: any) => u.id);

    let profiles: any[] = [];
    if (alumniUserIds.length > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, employment_status, current_job_title, company_name, industry, city, province')
        .in('user_id', alumniUserIds);
      profiles = p || [];
    }

    const profileIds = profiles.map((p: any) => p.id);
    let education: any[] = [];
    let employment: any[] = [];
    let skills: any[] = [];
    if (profileIds.length > 0) {
      const [{ data: e }, { data: emp }, { data: sk }] = await Promise.all([
        supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
        supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, job_type, start_date, end_date, is_current, updated_at').in('profile_id', profileIds),
        supabase.from('skills').select('profile_id, name, category').in('profile_id', profileIds),
      ]);
      education = e || [];
      employment = emp || [];
      skills = sk || [];
    }

    let careerFeedback: any[] = [];
    if (profileIds.length > 0) {
      const { data: cf } = await supabase
        .from('career_feedback')
        .select('profile_id, skills_used_at_work, suggested_skills, suggested_subjects, recommend_changes, degree_relevance, curriculum_preparation')
        .in('profile_id', profileIds);
      careerFeedback = cf || [];
    }

    const { data: surveys } = await supabase.from('surveys').select('id, academic_year, status, is_active');
    const { data: surveyResponses } = await supabase
      .from('survey_responses')
      .select('survey_id, user_id, responses, submitted_at')
      .order('submitted_at', { ascending: true });

    const profileByUser = new Map(profiles.map((p: any) => [p.user_id, p.id]));
    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
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

    const academicYears = [...new Set((surveys || []).map((s: any) => s.academic_year).filter(Boolean))].sort();
    const academicYearUserIds = new Set<string>();
    if (academicYear) {
      const matchingSurveys = (surveys || []).filter((s: any) => s.academic_year === academicYear).map((s: any) => s.id);
      const ids = new Set(matchingSurveys);
      (surveyResponses || []).forEach((r: any) => {
        if (ids.has(r.survey_id)) academicYearUserIds.add(r.user_id);
      });
    }

    const latestResponseByUser = new Map<string, any>();
    (surveyResponses || []).forEach((r: any) => {
      latestResponseByUser.set(r.user_id, r);
    });

    const isCurrent = (e: any) => e.is_current === true;
    const employmentStatusOf = (p: any) => {
      const raw = p.employment_status || (empByProfile.get(p.id) || []).find(isCurrent)?.employment_status || null;
      const lower = String(raw || '').toLowerCase();
      if (raw === 'Employed' || lower === 'employed') return 'Employed';
      if (lower === 'self-employed' || lower === 'entrepreneur') return 'Self-employed';
      if (lower === 'student') return 'Pursuing Further Studies';
      return 'Unemployed';
    };

    const eligibleProfiles = profiles.filter((p: any) => {
      if (academicYear && !academicYearUserIds.has(p.user_id)) return false;
      const edu = eduByProfile.get(p.id) || [];
      if (batch && !edu.some((e: any) => String(e.year_graduated) === batch)) return false;
      if (course && !edu.some((e: any) => abbreviateProgram(e.program) === course)) return false;

      const status = employmentStatusOf(p);
      if (statusFilter && status !== statusFilter) return false;

      const resp = latestResponseByUser.get(p.user_id)?.responses || {};
      const alignment = alignmentCategory(resp.course_alignment);
      if (alignmentFilter && alignment !== alignmentFilter) return false;

      const emp = empByProfile.get(p.id) || [];
      const currentEmp = emp.filter(isCurrent);
      if (industryFilter) {
        const industries = currentEmp.map((e: any) => String(e.company_industry || '').trim()).concat(p.industry || '');
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

    // --- Degree Alignment (from latest survey response per user) ---
    const alignmentCounts: Record<string, number> = { 'Aligned with Degree': 0, 'Partially Aligned': 0, 'Not Aligned': 0 };
    let alignmentTotal = 0;
    eligibleProfiles.forEach((p: any) => {
      const resp = latestResponseByUser.get(p.user_id)?.responses || {};
      const cat = alignmentCategory(resp.course_alignment);
      if (cat) {
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
      const resp = latestResponseByUser.get(p.user_id)?.responses || {};
      const score = SAT_SCORE[resp.satisfaction_rating];
      if (score) {
        satisfactionSum += score;
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
    const skillCount: Record<string, number> = {};
    eligibleSkills.forEach((s: any) => {
      const name = String(s.name || '').trim();
      if (name) skillCount[name] = (skillCount[name] || 0) + 1;
    });
    careerFeedback.forEach((c: any) => {
      if (!eligibleIds.has(c.profile_id)) return;
      (c.skills_used_at_work || []).forEach((name: string) => {
        const n = String(name || '').trim();
        if (n) skillCount[n] = (skillCount[n] || 0) + 1;
      });
    });
    const skillsFrequentlyUsed = toRanked(skillCount)
      .map((s) => ({ name: s.name, count: s.count, percentage: totalAlumni > 0 ? Math.round((s.count / totalAlumni) * 100) : 0 }))
      .slice(0, 12);

    // --- Emerging Technologies ---
    const profileSkills = new Map<string, Set<string>>();
    eligibleSkills.forEach((s: any) => {
      const name = String(s.name || '').trim();
      if (!name) return;
      if (!profileSkills.has(s.profile_id)) profileSkills.set(s.profile_id, new Set());
      profileSkills.get(s.profile_id)!.add(name);
    });
    careerFeedback.forEach((c: any) => {
      if (!eligibleIds.has(c.profile_id)) return;
      (c.skills_used_at_work || []).forEach((name: string) => {
        const n = String(name || '').trim();
        if (!n) return;
        if (!profileSkills.has(c.profile_id)) profileSkills.set(c.profile_id, new Set());
        profileSkills.get(c.profile_id)!.add(n);
      });
    });

    const gradYearOf = (profileId: string) => {
      const edu = eduByProfile.get(profileId) || [];
      const years = edu.map((e: any) => Number(e.year_graduated)).filter((y: number) => !isNaN(y));
      return years.length ? Math.max(...years) : null;
    };
    const recentCutoff = 2;
    const emergingTechnologies = EMERGING_TECHS.map((tech) => {
      let count = 0;
      let recent = 0;
      let earlier = 0;
      profileSkills.forEach((names, profileId) => {
        const hit = [...names].some((n) => tech.match.test(n));
        if (!hit) return;
        count++;
        const gy = gradYearOf(profileId);
        if (gy && gy >= new Date().getFullYear() - recentCutoff) recent++;
        else earlier++;
      });
      let growth: string;
      if (count === 0) growth = 'No Usage';
      else if (recent > 0 && earlier === 0) growth = 'New';
      else if (recent > earlier) growth = 'Trending Up';
      else growth = 'Stable';
      return { technology: tech.technology, count, growth };
    }).filter((t) => t.count > 0);

    // --- Skills Gap Analysis ---
    const curriculumCoverage: Record<string, number> = {};
    eligibleSkills.forEach((s: any) => {
      const name = String(s.name || '').trim();
      if (name) curriculumCoverage[name] = (curriculumCoverage[name] || 0) + 1;
    });
    const workplaceUsage: Record<string, number> = {};
    careerFeedback.forEach((c: any) => {
      if (!eligibleIds.has(c.profile_id)) return;
      (c.skills_used_at_work || []).forEach((name: string) => {
        const n = String(name || '').trim();
        if (n) workplaceUsage[n] = (workplaceUsage[n] || 0) + 1;
      });
    });
    const skillsGap = Object.entries(workplaceUsage)
      .map(([skill, usage]) => {
        const coverage = curriculumCoverage[skill] || 0;
        return {
          skill,
          workplaceUsage: usage,
          curriculumCoverage: coverage,
          gap: usage - coverage,
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
        recommendation: REC_TEXTS[normalize(g.skill)] || `Consider integrating ${g.skill} more deeply into the curriculum with hands-on projects.`,
      }));

    // --- Curriculum Recommendation Cards ---
    const candidates = [
      ...emergingTechnologies.map((t) => ({ title: t.technology, count: t.count, kind: 'technology' as const })),
      ...skillsGap.map((g) => ({ title: g.skill, count: g.workplaceUsage, kind: 'gap' as const, gap: g.gap, coverage: g.curriculumCoverage })),
    ];
    const maxCount = Math.max(1, ...candidates.map((c) => c.count));
    const recommendations = candidates
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((c) => {
        const priority = c.count >= 0.6 * maxCount ? 'High' : c.count >= 0.3 * maxCount ? 'Medium' : 'Low';
        const supportingData = c.kind === 'gap'
          ? `${c.count} alumni use ${c.title} at work but only ${c.coverage} report it as a learned skill.`
          : `${c.count} alumni report using ${c.title} in their jobs.`;
        const suggestedImprovement = c.kind === 'gap'
          ? (REC_TEXTS[normalize(c.title)] || `Consider integrating ${c.title} more deeply into the curriculum with hands-on projects.`)
          : (REC_TEXTS[normalize(c.title)] || `Consider introducing or expanding ${c.title} topics, electives, or laboratory activities.`);
        return { title: c.title, priority, supportingData, suggestedImprovement };
      });

    // --- Common Career Paths ---
    const careerCount: Record<string, number> = {};
    const mergedEmployment = [...eligibleEmployment];
    eligibleProfiles.forEach((p: any) => {
      const hasRecord = mergedEmployment.some((e: any) => e.profile_id === p.id);
      if (!hasRecord && p.current_job_title) {
        mergedEmployment.push({
          profile_id: p.id,
          position: p.current_job_title,
          company_name: p.company_name,
          company_industry: p.industry,
          is_current: true,
        });
      }
    });
    mergedEmployment.forEach((e: any) => {
      if (!isCurrent(e) || !e.position) return;
      const pos = String(e.position).trim();
      if (pos) careerCount[pos] = (careerCount[pos] || 0) + 1;
    });
    const careerPaths = Object.entries(careerCount)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Industry Alignment ---
    const industryCount: Record<string, number> = {};
    const countedIndustry = new Set<string>();
    eligibleProfiles.forEach((p: any) => {
      const emp = empByProfile.get(p.id) || [];
      const ind = String((emp.find(isCurrent)?.company_industry || p.industry) || '').trim();
      if (ind && !countedIndustry.has(p.id)) {
        industryCount[ind] = (industryCount[ind] || 0) + 1;
        countedIndustry.add(p.id);
      }
    });
    const industryAlignment = toRanked(industryCount)
      .map((i) => ({ industry: i.name, count: i.count, percentage: totalAlumni > 0 ? Math.round((i.count / totalAlumni) * 100) : 0 }))
      .slice(0, 10);

    // --- Graduate Feedback Summary ---
    const themeHits: Record<string, { count: number; example: string | null }> = {};
    const seenUserTheme = new Set<string>();
    eligibleProfiles.forEach((p: any) => {
      const resp = latestResponseByUser.get(p.user_id)?.responses || {};
      const suggestion = String(resp.suggestions || '').trim();
      const cf = feedbackByProfile.get(p.id);
      const extras = [
        ...(cf?.suggested_skills || []),
        ...(cf?.suggested_subjects || []),
        ...(cf?.recommend_changes ? ['recommend changes'] : []),
      ].map((s: string) => String(s)).join(' ');
      const text = `${suggestion} ${extras}`;
      if (!text.trim()) return;
      FEEDBACK_THEMES.forEach((t) => {
        if (!t.match.test(text)) return;
        const key = `${p.user_id}:${t.theme}`;
        if (seenUserTheme.has(key)) return;
        seenUserTheme.add(key);
        if (!themeHits[t.theme]) themeHits[t.theme] = { count: 0, example: null };
        themeHits[t.theme].count++;
        if (!themeHits[t.theme].example && suggestion) {
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
      actions = { high: recHigh, medium: recMedium, low: recLow };
    } else {
      const themeTitles = feedbackThemes.map((t) => t.theme);
      actions = {
        high: themeTitles.slice(0, 1),
        medium: themeTitles.slice(1, 3),
        low: themeTitles.slice(3, 6),
      };
    }

    const industries = [...new Set(
      employment.map((e: any) => String(e.company_industry || '').trim()).concat(profiles.map((p: any) => String(p.industry || '').trim()))
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
