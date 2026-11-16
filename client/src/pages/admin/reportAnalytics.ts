export type KpiTone = 'orange' | 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'indigo';

export interface ReportKpiCard {
  label: string;
  value: string;
  subtext: string;
  tone: KpiTone;
}

export interface ChartDatum {
  name: string;
  primary: number;
  secondary?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export interface FieldCoverageItem {
  field: string;
  filled: number;
  total: number;
  pct: number;
}

export interface MissingGapGroup {
  key: string;
  label: string;
  count: number;
  pct: number;
  severity: 'critical' | 'warning' | 'info';
  userAction: string;
  adminAction: string;
}

export interface AnalyzedRow {
  index: number;
  row: Record<string, any>;
  missingKeys: string[];
  missingLabels: string[];
  isComplete: boolean;
}

export interface ReportAnalysisResult {
  rows: Record<string, any>[];
  analyzedRows: AnalyzedRow[];
  completeCount: number;
  incompleteCount: number;
  completenessPct: number;
  kpis: ReportKpiCard[];
  chartTitle: string;
  chartSubtitle: string;
  chartData: ChartDatum[];
  primarySeriesName: string;
  secondarySeriesName?: string;
  fieldCoverage: FieldCoverageItem[];
  missingGroups: MissingGapGroup[];
  userSteps: string[];
  adminSteps: string[];
}

interface GapRule {
  key: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  userAction: string;
  adminAction: string;
  isMissing: (row: Record<string, any>) => boolean;
}

const EMPTY_STRINGS = new Set(['', 'n/a', 'na', 'none', 'null', 'undefined', '---', '-', 'not specified', 'unverified']);

function isBlank(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return EMPTY_STRINGS.has(s);
}

function toNum(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const cleaned = String(val ?? '').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function shortProgramName(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return 'Unspecified';
  const l = s.toLowerCase();
  if (l.includes('information technology') || l === 'bsit') return 'BSIT';
  if (l.includes('industrial technology') || l === 'bit') return 'BIT';
  if (l.includes('elementary education') || l === 'beed') return 'BEEd';
  if (l.includes('secondary education') || l.includes('mathematics') || l.includes('bsed')) return 'BSEd';
  if (l.includes('livelihood education') || l.includes('btled')) return 'BTLEd';
  return s.length > 18 ? `${s.slice(0, 16)}…` : s;
}

/** Normalize raw API payload (including system-master multi-table bundle) into flat table rows. */
export function normalizeReportRows(reportId: string, payload: any): Record<string, any>[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  // system-master returns multi-entity JSON instead of { data: [...] }
  if (reportId === 'system-master' && Array.isArray(payload?.alumniUsers)) {
    const profilesByUid = new Map<string, any>(
      (payload.profiles || []).map((p: any) => [String(p.user_id), p])
    );
    const eduByPid = new Map<string, any>();
    for (const e of payload.education || []) {
      const k = String(e.profile_id);
      if (!eduByPid.has(k)) eduByPid.set(k, e);
    }
    const empByPid = new Map<string, any[]>();
    for (const e of payload.employment || []) {
      const k = String(e.profile_id);
      if (!empByPid.has(k)) empByPid.set(k, []);
      empByPid.get(k)!.push(e);
    }
    const currentYear = new Date().getFullYear();
    return (payload.alumniUsers || [])
      .filter((u: any) => !u.is_archived)
      .map((u: any) => {
        const prof: any = profilesByUid.get(String(u.id)) || {};
        const edu: any = eduByPid.get(String(prof.id)) || {};
        const emps = empByPid.get(String(prof.id)) || [];
        const currentEmp = emps.find(
          (e: any) =>
            String(e.record_category || '').toLowerCase() !== 'ojt' &&
            String(e.job_type || '').toLowerCase() !== 'internship' &&
            (!e.end_date || String(e.end_date).toLowerCase() === 'present')
        );
        const isStudent = Boolean(edu.year_graduated && Number(edu.year_graduated) > currentYear);
        return {
          'Email': u.email || '',
          'Full Name': `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || u.email || '',
          'ID Number': prof.id_number || '',
          'Program': edu.program || '',
          'Batch': edu.year_graduated || '',
          'Role Status': isStudent ? 'Student' : edu.year_graduated ? 'Alumni' : 'Unverified',
          'Employment Status': currentEmp ? 'Employed' : (prof.employment_status || 'Not Reported'),
          'Current Company': currentEmp?.company_name || prof.company_name || '',
          'Current Position': currentEmp?.position || prof.current_job_title || '',
          'Survey Completed': u.survey_completed ? 'Yes' : 'No',
          'Verified': u.is_verified ? 'Yes' : 'No',
        };
      });
  }

  return [];
}

function getGapRules(reportId: string): GapRule[] {
  switch (reportId) {
    case 'alumni':
      return [
        {
          key: 'missing_id',
          label: 'Missing CTU ID Number',
          severity: 'warning',
          userAction: 'Go to Profile → Edit Profile and enter your official CTU Student/Alumni ID Number.',
          adminAction: 'Check Alumni Management and verify ID numbers against Registrar records.',
          isMissing: (r) => isBlank(r['ID Number']),
        },
        {
          key: 'missing_program',
          label: 'Missing Degree Program or Batch Year',
          severity: 'critical',
          userAction: 'Open Profile → Education and select your CTU-Naga degree program and graduation batch year.',
          adminAction: 'Filter Alumni Management for incomplete education records and prompt cohort update.',
          isMissing: (r) => isBlank(r['Degree Program']) || isBlank(r['Graduation Year']),
        },
        {
          key: 'not_reported_emp',
          label: 'Employment Status Still "Not Reported"',
          severity: 'critical',
          userAction: 'Open Profile → Employment History and update whether you are Employed, Self-Employed, Seeking Opportunities, or a Student.',
          adminAction: 'Send a tracer follow-up reminder to non-reporting alumni.',
          isMissing: (r) => String(r['Employment Status'] || '').toLowerCase() === 'not reported',
        },
        {
          key: 'missing_job_details',
          label: 'Employed Without Complete Job / Salary Details',
          severity: 'warning',
          userAction: 'Complete your Company Name, Position, Industry, and Salary Bracket under Profile → Employment.',
          adminAction: 'Request employed alumni to complete industry and salary fields for CHED analytics.',
          isMissing: (r) => {
            const st = String(r['Employment Status'] || '').toLowerCase();
            if (st !== 'employed' && st !== 'self-employed') return false;
            return isBlank(r['Current Company']) || isBlank(r['Current Position']) || isBlank(r['Salary Range']);
          },
        },
        {
          key: 'missing_contact',
          label: 'Missing Phone or Location (City / Province)',
          severity: 'info',
          userAction: 'Add your active mobile number and current City/Province in Profile → Contact Info.',
          adminAction: 'Keep contact details updated for institutional announcements and job alerts.',
          isMissing: (r) => isBlank(r['Phone']) || isBlank(r['City']),
        },
        {
          key: 'unverified_account',
          label: 'Account Not Yet Verified',
          severity: 'warning',
          userAction: 'Verify your registered email address and wait for Registrar/Admin approval.',
          adminAction: 'Review pending alumni accounts in Alumni Management and approve verified graduates.',
          isMissing: (r) => String(r['Verified'] || '').toLowerCase() !== 'yes',
        },
      ];

    case 'employment':
      return [
        {
          key: 'missing_salary',
          label: 'Missing Salary Bracket',
          severity: 'warning',
          userAction: 'Update your employment entry with a Salary Bracket (or confidentiality-safe tier) under Profile → Employment.',
          adminAction: 'Encourage graduates to select a salary bracket to improve Compensation Analytics accuracy.',
          isMissing: (r) => isBlank(r['Salary Range']),
        },
        {
          key: 'missing_industry',
          label: 'Missing Industry / Sector Classification',
          severity: 'warning',
          userAction: 'Edit your job record and pick the matching Industry / Sector from the dropdown.',
          adminAction: 'Review uncategorized companies so Career Analytics industry charts stay accurate.',
          isMissing: (r) => isBlank(r['Industry']),
        },
        {
          key: 'missing_dates',
          label: 'Missing Start Date or Job Type',
          severity: 'info',
          userAction: 'Add your job start date and employment modality (Full-time, Part-time, Contract, Freelance).',
          adminAction: 'Remind alumni to record start dates for accurate time-to-employment metrics.',
          isMissing: (r) => isBlank(r['Start Date']) || isBlank(r['Job Type']),
        },
        {
          key: 'missing_program',
          label: 'Missing Degree Program / Batch Link',
          severity: 'critical',
          userAction: 'Add your CTU-Naga degree program under Profile → Education.',
          adminAction: 'Link orphan employment entries to their academic cohort in Alumni Management.',
          isMissing: (r) => isBlank(r['Degree Program']) || isBlank(r['Graduation Year']),
        },
      ];

    case 'employment-proofs':
      return [
        {
          key: 'no_proof',
          label: 'No Employment Proof Submitted',
          severity: 'critical',
          userAction: 'Upload a Certificate of Employment (COE), Payslip, Contract, or Company ID in Profile → Employment.',
          adminAction: 'Notify graduates without documents so employment credentials can be audited.',
          isMissing: (r) => String(r['Verification Status'] || '').toLowerCase() === 'no proof submitted',
        },
        {
          key: 'pending_verification',
          label: 'Uploaded Proof Waiting for Admin Review',
          severity: 'warning',
          userAction: 'Wait for an administrator to review your uploaded document.',
          adminAction: 'Open uploaded Proof File URLs and mark valid submissions as Verified in Alumni Management.',
          isMissing: (r) => String(r['Verification Status'] || '').toLowerCase() === 'pending verification',
        },
        {
          key: 'rejected_proof',
          label: 'Proof Rejected — Re-upload Required',
          severity: 'critical',
          userAction: 'Upload a clearer or valid Certificate of Employment / Company ID document.',
          adminAction: 'Message the alumnus to clarify why the document was rejected and request a replacement.',
          isMissing: (r) => String(r['Verification Status'] || '').toLowerCase() === 'rejected',
        },
        {
          key: 'missing_emp_record',
          label: 'No Employment / OJT Record Logged Yet',
          severity: 'warning',
          userAction: 'Add your current job or OJT deployment under Profile → Employment History.',
          adminAction: 'Follow up with alumni/students who have neither employment nor OJT logged.',
          isMissing: (r) => isBlank(r['Record Category']) || isBlank(r['Company Name']),
        },
      ];

    case 'ojt-clearance':
      return [
        {
          key: 'pending_ojt_update',
          label: 'Pending OJT / Practice Teaching Deployment Update',
          severity: 'critical',
          userAction: 'Go to Profile → Employment History, check "Currently Deployed for OJT / Practice Teaching", and fill in School/Company, Role, Industry, and Start Date.',
          adminAction: 'Broadcast a reminder to 4th-year Educ/IT/BIT students who still show "Pending OJT Update".',
          isMissing: (r) => String(r['Clearance Status'] || '').toLowerCase() === 'pending ojt update',
        },
        {
          key: 'missing_proof',
          label: 'Submitted OJT Without Supporting Proof / Endorsement',
          severity: 'warning',
          userAction: 'Upload your OJT Endorsement Letter, MOA, or Company ID link in the OJT deployment section.',
          adminAction: 'Verify with OJT coordinator or request proof upload before signing clearance.',
          isMissing: (r) =>
            String(r['Clearance Status'] || '').toLowerCase() !== 'pending ojt update' &&
            String(r['Proof Uploaded'] || '').toLowerCase() !== 'yes',
        },
        {
          key: 'ready_to_clear',
          label: 'OJT Submitted — Waiting for Clearance Verification',
          severity: 'info',
          userAction: 'Your OJT info is submitted. Wait for your coordinator/admin to mark your graduation clearance Verified.',
          adminAction: 'Review submitted OJT deployments (and proof if uploaded) and mark them Cleared.',
          isMissing: (r) => String(r['Clearance Status'] || '').toLowerCase() === 'submitted (ready to clear)',
        },
        {
          key: 'missing_id_or_program',
          label: 'Missing Student ID Number or Degree Program',
          severity: 'warning',
          userAction: 'Complete your Student ID Number and Degree Program on your Profile.',
          adminAction: 'Ensure every 4th-year candidate has an ID Number and CTU program before clearance printing.',
          isMissing: (r) => isBlank(r['ID Number']) || isBlank(r['Degree Program']),
        },
      ];

    case 'career-progress':
      return [
        {
          key: 'missing_industry',
          label: 'Missing Industry Classification',
          severity: 'warning',
          userAction: 'Edit your career history entries and choose the matching Industry.',
          adminAction: 'Audit trajectory rows missing industry tags for sector mobility analysis.',
          isMissing: (r) => isBlank(r['Industry']),
        },
        {
          key: 'missing_start_date',
          label: 'Missing Position Start Date',
          severity: 'warning',
          userAction: 'Add start dates to every role in Profile → Employment History to preserve chronological order.',
          adminAction: 'Flag entries missing start dates so promotion timelines remain accurate.',
          isMissing: (r) => isBlank(r['Start Date']),
        },
        {
          key: 'single_role_only',
          label: 'Only 1 Role Logged (No Prior History Yet)',
          severity: 'info',
          userAction: 'Add previous internships or earlier jobs if you want your full career timeline reflected.',
          adminAction: 'Normal for fresh graduates; encourage experienced alumni to add past roles.',
          isMissing: (r) => toNum(r['Total Positions Tracked']) <= 1,
        },
      ];

    case 'salary':
      return [
        {
          key: 'zero_respondents',
          label: 'Salary Bracket With Zero Reported Alumni',
          severity: 'info',
          userAction: 'Select your current Salary Range when updating your employment details.',
          adminAction: 'Encourage employed graduates to share salary bracket ranges during tracer campaigns.',
          isMissing: (r) => toNum(r['Alumni Count']) === 0,
        },
      ];

    case 'employment-by-course':
      return [
        {
          key: 'has_not_reported',
          label: 'Program Has Unreported Graduates',
          severity: 'warning',
          userAction: 'Graduates in this program should update their Employment Status in Profile or submit the Tracer Survey.',
          adminAction: 'Target tracer outreach campaigns toward programs with high Not Reported counts.',
          isMissing: (r) => toNum(r['Not Reported']) > 0,
        },
        {
          key: 'low_employment_rate',
          label: 'Employment Rate Below 50% of Graduates',
          severity: 'critical',
          userAction: 'Job-seeking alumni should complete their skills & resume for employer matching.',
          adminAction: 'Connect unemployed/seeking cohorts with partner employers and job postings.',
          isMissing: (r) => {
            const val = String(r['Employment Rate (Graduates %)'] || '');
            if (val === 'N/A') return true;
            return toNum(val) < 50;
          },
        },
      ];

    case 'batch-employment':
      return [
        {
          key: 'batch_unreported',
          label: 'Batch Has Graduates With Unreported Status',
          severity: 'warning',
          userAction: 'Alumni from this graduation year should update their Employment Status and answer the active Tracer Survey.',
          adminAction: 'Run batch-specific follow-up via Announcements or Tracer Surveys.',
          isMissing: (r) => toNum(r['Not Reported']) > 0,
        },
        {
          key: 'no_respondents',
          label: 'Zero Survey/Employment Respondents in Batch',
          severity: 'critical',
          userAction: 'Alumni in this cohort need to complete their Profile → Employment.',
          adminAction: 'Verify cohort contact emails and send tracer study invitations.',
          isMissing: (r) => toNum(r['Respondents']) === 0,
        },
      ];

    case 'degree-alignment':
      return [
        {
          key: 'low_response_rate',
          label: 'Response Rate Below 50% (CHED Tracer Gap)',
          severity: 'critical',
          userAction: 'Complete your Graduate Tracer Survey and update your current job title on your profile.',
          adminAction: 'Push tracer survey completion for this program before accreditation / SUC leveling submission.',
          isMissing: (r) => toNum(r['Response Rate (%)']) < 50,
        },
        {
          key: 'needs_alignment_review',
          label: 'Curriculum Alignment Needs Review or Insufficient Data',
          severity: 'warning',
          userAction: 'Ensure your current job title and industry accurately describe your actual role.',
          adminAction: 'Review unaligned roles with Curriculum Insights to assess competency gaps.',
          isMissing: (r) => {
            const st = String(r['Relevance Status'] || '').toLowerCase();
            return st.includes('needs review') || st.includes('insufficient') || st.includes('low');
          },
        },
      ];

    case 'employer':
      return [
        {
          key: 'unverified_partner',
          label: 'Partner Employer Pending Verification',
          severity: 'warning',
          userAction: 'Employers should complete their company profile and official contact email.',
          adminAction: 'Verify company legitimacy in Partner Companies and mark as Verified Partner.',
          isMissing: (r) => String(r['Verification Status'] || '').toLowerCase() !== 'verified partner',
        },
        {
          key: 'missing_contact_info',
          label: 'Missing Contact Email, Phone, or Location',
          severity: 'warning',
          userAction: 'Update official HR email, phone, and City/Province in Company Settings.',
          adminAction: 'Follow up with partner HR contacts to complete directory contact details.',
          isMissing: (r) => isBlank(r['Contact Email']) || isBlank(r['Contact Phone']) || isBlank(r['City']),
        },
        {
          key: 'no_active_jobs',
          label: 'Zero Active Job Postings',
          severity: 'info',
          userAction: 'Post available OJT slots or entry-level vacancies on the Job Board.',
          adminAction: 'Reach out to partner employers to invite new graduate and OJT openings.',
          isMissing: (r) => toNum(r['Active Job Openings']) === 0,
        },
      ];

    case 'surveys':
      return [
        {
          key: 'low_completion',
          label: 'Tracer Completion Below 50%',
          severity: 'critical',
          userAction: 'Open Graduate Tracer Surveys and submit your pending questionnaire.',
          adminAction: 'Send reminder notifications and announcements to targeted cohorts.',
          isMissing: (r) => {
            const cr = String(r['Completion Rate (%)'] || '');
            return cr === 'N/A' || toNum(cr) < 50;
          },
        },
        {
          key: 'zero_responses',
          label: 'No Responses Recorded Yet',
          severity: 'warning',
          userAction: 'Submit your tracer survey response before the cycle closes.',
          adminAction: 'Check that the survey is Active and its Target Groups match valid programs/batches.',
          isMissing: (r) => toNum(r['Total Responses']) === 0,
        },
      ];

    case 'survey-responses':
      return [
        {
          key: 'missing_student_id',
          label: 'Response Missing Student / Alumni ID Number',
          severity: 'warning',
          userAction: 'Add your Student/Alumni ID Number in Profile so tracer responses link cleanly.',
          adminAction: 'Cross-reference respondent email with Alumni Management to fill missing IDs.',
          isMissing: (r) => isBlank(r['Student ID']),
        },
        {
          key: 'unanswered_questions',
          label: 'Has Blank / Unanswered Questionnaire Fields',
          severity: 'info',
          userAction: 'Answer all applicable items when completing future tracer surveys.',
          adminAction: 'Check optional vs. required survey question settings for future tracer cycles.',
          isMissing: (r) => {
            const fixed = new Set(['Survey Title', 'Respondent Name', 'Respondent Email', 'Student ID', 'Submission Timestamp']);
            return Object.entries(r).some(([k, v]) => !fixed.has(k) && isBlank(v));
          },
        },
      ];

    case 'skills':
      return [
        {
          key: 'zero_verified',
          label: 'No Verified Skill Endorsements Yet',
          severity: 'info',
          userAction: 'Upload certificates or supporting credentials matching your listed skills.',
          adminAction: 'Prioritize verification for top in-demand technical and teaching competencies.',
          isMissing: (r) => toNum(r['Verified Skills Count']) === 0,
        },
        {
          key: 'missing_proficiency',
          label: 'Missing Proficiency Rating',
          severity: 'warning',
          userAction: 'Rate your proficiency level (1–5) for each skill in Profile → Skills.',
          adminAction: 'Prompt graduates to add proficiency ratings so competency averages are populated.',
          isMissing: (r) => isBlank(r['Average Proficiency (1-5)']),
        },
      ];

    case 'jobs':
      return [
        {
          key: 'missing_salary',
          label: 'Job Posting Missing Salary Range',
          severity: 'info',
          userAction: 'Employers/posters should include an expected salary range for transparency.',
          adminAction: 'Edit job postings or ask partner companies to provide compensation ranges.',
          isMissing: (r) => isBlank(r['Salary Range']),
        },
        {
          key: 'zero_applicants',
          label: 'Zero Applicants So Far',
          severity: 'warning',
          userAction: 'Eligible alumni and OJT students can apply directly under Job Postings.',
          adminAction: 'Promote low-applicant vacancies in Feed Announcements or targeted alerts.',
          isMissing: (r) => toNum(r['Total Applicants']) === 0,
        },
        {
          key: 'pending_review_apps',
          label: 'Has Applicants Pending Review',
          severity: 'info',
          userAction: 'Wait for employer or admin review of your submitted application.',
          adminAction: 'Follow up with partner employers on applications stuck in Pending Review.',
          isMissing: (r) => toNum(r['Pending Review']) > 0,
        },
      ];

    case 'system-master':
      return [
        {
          key: 'missing_id_program',
          label: 'Missing ID Number, Program, or Batch',
          severity: 'critical',
          userAction: 'Complete your CTU ID Number, Degree Program, and Batch Year under Profile.',
          adminAction: 'Clean up incomplete user profiles in Alumni Management before archiving.',
          isMissing: (r) => isBlank(r['ID Number']) || isBlank(r['Program']) || isBlank(r['Batch']),
        },
        {
          key: 'pending_survey',
          label: 'Has Not Completed Active Tracer Survey',
          severity: 'warning',
          userAction: 'Complete your Graduate Tracer Survey to keep institutional records current.',
          adminAction: 'Send survey reminders to alumni marked "Survey Completed: No".',
          isMissing: (r) => String(r['Survey Completed'] || '').toLowerCase() !== 'yes',
        },
        {
          key: 'not_reported_emp',
          label: 'Employment Status Still Not Reported',
          severity: 'warning',
          userAction: 'Update your Employment Status or OJT deployment on your Profile.',
          adminAction: 'Follow up with unreported users to maximize institutional dataset coverage.',
          isMissing: (r) => String(r['Employment Status'] || '').toLowerCase() === 'not reported',
        },
      ];

    default:
      return [];
  }
}

function buildFieldCoverage(rows: Record<string, any>[]): FieldCoverageItem[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]).filter((k) => k !== 'User ID' && k !== 'Survey ID');
  return keys.slice(0, 10).map((field) => {
    const filled = rows.filter((r) => !isBlank(r[field])).length;
    return {
      field,
      filled,
      total: rows.length,
      pct: pct(filled, rows.length),
    };
  });
}

function buildChartAndKpis(
  reportId: string,
  rows: Record<string, any>[],
  payload: any,
  completeCount: number,
  incompleteCount: number
): {
  kpis: ReportKpiCard[];
  chartTitle: string;
  chartSubtitle: string;
  chartData: ChartDatum[];
  primarySeriesName: string;
  secondarySeriesName?: string;
} {
  const total = rows.length;
  const completenessPct = pct(completeCount, total);

  if (reportId === 'ojt-clearance') {
    const cleared = rows.filter((r) => String(r['Clearance Status'] || '').toLowerCase() === 'cleared').length;
    const submitted = rows.filter((r) => String(r['Clearance Status'] || '').toLowerCase() !== 'pending ojt update').length;
    const pending = total - submitted;
    const byProgram: Record<string, { total: number; submitted: number }> = {};
    rows.forEach((r) => {
      const p = shortProgramName(r['Degree Program']);
      if (!byProgram[p]) byProgram[p] = { total: 0, submitted: 0 };
      byProgram[p].total++;
      if (String(r['Clearance Status'] || '').toLowerCase() !== 'pending ojt update') {
        byProgram[p].submitted++;
      }
    });
    return {
      kpis: [
        { label: '4th-Year / OJT Cohort', value: total.toLocaleString(), subtext: 'Tracked students', tone: 'blue' },
        { label: 'OJT Deployed / Updated', value: `${submitted} (${pct(submitted, total)}%)`, subtext: `${cleared} clearance verified`, tone: 'emerald' },
        { label: 'Pending OJT Update', value: pending.toLocaleString(), subtext: 'Need student deployment entry', tone: 'rose' },
        { label: 'Record Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} fully ready`, tone: 'amber' },
      ],
      chartTitle: 'OJT Submission Coverage by Degree Program',
      chartSubtitle: 'Submitted OJT deployments vs. total tracked students per program',
      chartData: Object.entries(byProgram).map(([name, v]) => ({
        name,
        primary: v.submitted,
        secondary: Math.max(0, v.total - v.submitted),
      })),
      primarySeriesName: 'OJT Submitted',
      secondarySeriesName: 'Pending Update',
    };
  }

  if (reportId === 'alumni') {
    const employed = rows.filter((r) => ['employed', 'self-employed'].includes(String(r['Employment Status'] || '').toLowerCase())).length;
    const notReported = rows.filter((r) => String(r['Employment Status'] || '').toLowerCase() === 'not reported').length;
    const verified = rows.filter((r) => String(r['Verified'] || '').toLowerCase() === 'yes').length;
    const byProgram: Record<string, { reported: number; missing: number }> = {};
    rows.forEach((r) => {
      const p = shortProgramName(r['Degree Program']);
      if (!byProgram[p]) byProgram[p] = { reported: 0, missing: 0 };
      if (String(r['Employment Status'] || '').toLowerCase() === 'not reported') byProgram[p].missing++;
      else byProgram[p].reported++;
    });
    return {
      kpis: [
        { label: 'Total Registered', value: total.toLocaleString(), subtext: `${verified} verified (${pct(verified, total)}%)`, tone: 'orange' },
        { label: 'Profile Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} zero gaps`, tone: 'emerald' },
        { label: 'Employed / Self-Employed', value: `${employed} (${pct(employed, total)}%)`, subtext: 'Active employment outcome', tone: 'blue' },
        { label: 'Not Reported / Incomplete', value: notReported.toLocaleString(), subtext: `${incompleteCount} total records need attention`, tone: 'rose' },
      ],
      chartTitle: 'Tracer Reporting Status by Program',
      chartSubtitle: 'Reported status vs. Not Reported graduates across academic programs',
      chartData: Object.entries(byProgram).map(([name, v]) => ({
        name,
        primary: v.reported,
        secondary: v.missing,
      })),
      primarySeriesName: 'Status Reported',
      secondarySeriesName: 'Not Reported',
    };
  }

  if (reportId === 'employment') {
    const currentRoles = rows.filter((r) => String(r['Current Position'] || '').toLowerCase() === 'yes').length;
    const hasSalary = rows.filter((r) => !isBlank(r['Salary Range'])).length;
    const byIndustry: Record<string, number> = {};
    rows.forEach((r) => {
      const ind = String(r['Industry'] || 'Unspecified').trim() || 'Unspecified';
      const shortInd = ind.length > 18 ? `${ind.slice(0, 16)}…` : ind;
      byIndustry[shortInd] = (byIndustry[shortInd] || 0) + 1;
    });
    const topIndustries = Object.entries(byIndustry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({ name, primary: count }));
    return {
      kpis: [
        { label: 'Employment Records', value: total.toLocaleString(), subtext: `${currentRoles} active current roles`, tone: 'emerald' },
        { label: 'Data Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} complete`, tone: 'blue' },
        { label: 'Salary Disclosed', value: `${pct(hasSalary, total)}%`, subtext: `${hasSalary} of ${total} records`, tone: 'amber' },
        { label: 'Records With Gaps', value: incompleteCount.toLocaleString(), subtext: 'Missing salary, industry, or dates', tone: 'rose' },
      ],
      chartTitle: 'Top Industries Employing Graduates',
      chartSubtitle: 'Distribution of employment entries by industry sector',
      chartData: topIndustries,
      primarySeriesName: 'Employment Records',
    };
  }

  if (reportId === 'employment-proofs') {
    const verified = rows.filter((r) => String(r['Verification Status'] || '').toLowerCase() === 'verified').length;
    const pending = rows.filter((r) => String(r['Verification Status'] || '').toLowerCase() === 'pending verification').length;
    const noProof = rows.filter((r) => String(r['Verification Status'] || '').toLowerCase() === 'no proof submitted').length;
    const byStatus: Record<string, number> = {};
    rows.forEach((r) => {
      const st = String(r['Verification Status'] || 'Unknown');
      byStatus[st] = (byStatus[st] || 0) + 1;
    });
    return {
      kpis: [
        { label: 'Graduates Audited', value: total.toLocaleString(), subtext: 'Tracked for credential audit', tone: 'blue' },
        { label: 'Verified Credentials', value: `${verified} (${pct(verified, total)}%)`, subtext: `${pending} pending admin review`, tone: 'emerald' },
        { label: 'No Proof Submitted', value: noProof.toLocaleString(), subtext: 'Requires document upload', tone: 'rose' },
        { label: 'Audit Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} verified`, tone: 'purple' },
      ],
      chartTitle: 'Proof Verification Breakdown',
      chartSubtitle: 'Count of alumni per credential verification stage',
      chartData: Object.entries(byStatus).map(([name, count]) => ({ name, primary: count })),
      primarySeriesName: 'Alumni Count',
    };
  }

  if (reportId === 'salary') {
    const summary = payload?.summary || {};
    const avg = summary.avgSalary ? `₱${Number(summary.avgSalary).toLocaleString()}` : '---';
    const hi = summary.highestSalary ? `₱${Number(summary.highestSalary).toLocaleString()}` : '---';
    const totalReported = summary.totalReported ?? rows.reduce((s, r) => s + toNum(r['Alumni Count']), 0);
    return {
      kpis: [
        { label: 'Salary Brackets', value: total.toLocaleString(), subtext: 'Philippine Peso ranges', tone: 'amber' },
        { label: 'Disclosed Graduates', value: Number(totalReported).toLocaleString(), subtext: 'Unique active respondents', tone: 'emerald' },
        { label: 'Estimated Avg Salary', value: avg, subtext: `Peak bracket midpoint: ${hi}`, tone: 'blue' },
        { label: 'Empty Brackets', value: incompleteCount.toLocaleString(), subtext: 'Brackets with 0 responses', tone: 'orange' },
      ],
      chartTitle: 'Salary Bracket Distribution',
      chartSubtitle: 'Number of graduates reporting within each PHP compensation range',
      chartData: rows.map((r) => ({
        name: String(r['Salary Bracket'] || '').replace('₱', ''),
        primary: toNum(r['Alumni Count']),
      })),
      primarySeriesName: 'Alumni Count',
    };
  }

  if (reportId === 'employment-by-course' || reportId === 'degree-alignment') {
    const isAlign = reportId === 'degree-alignment';
    const totalGrads = rows.reduce((s, r) => s + toNum(isAlign ? r['Total Graduates Tracked'] : r['Total Graduates']), 0);
    const totalEmployed = rows.reduce((s, r) => s + toNum(r['Employed Count']) + toNum(r['Self-Employed Count']), 0);
    const totalAligned = rows.reduce((s, r) => s + toNum(r['Job-Aligned Count']), 0);
    const totalNotRep = rows.reduce((s, r) => s + toNum(r['Not Reported']), 0);
    return {
      kpis: [
        { label: 'Academic Programs', value: total.toLocaleString(), subtext: `${totalGrads} total graduates tracked`, tone: 'indigo' },
        {
          label: isAlign ? 'Overall Alignment Rate' : 'Overall Employment Rate',
          value: isAlign
            ? `${pct(totalAligned, totalEmployed)}%`
            : `${pct(totalEmployed, totalGrads)}%`,
          subtext: isAlign ? `${totalAligned} aligned of ${totalEmployed} employed` : `${totalEmployed} employed / self-employed`,
          tone: 'emerald',
        },
        {
          label: isAlign ? 'Programs On Track' : 'Total Unreported',
          value: isAlign ? `${completeCount} / ${total}` : totalNotRep.toLocaleString(),
          subtext: isAlign ? 'Meeting >=50% response & alignment' : 'Graduates missing status',
          tone: 'amber',
        },
        { label: 'Programs Needing Action', value: incompleteCount.toLocaleString(), subtext: 'See missing-data checklist below', tone: 'rose' },
      ],
      chartTitle: isAlign ? 'Employed vs. Job-Aligned by Program' : 'Graduates vs. Employed by Program',
      chartSubtitle: 'Comparative outcomes per academic degree program',
      chartData: rows.map((r) => ({
        name: shortProgramName(r['Academic Program']),
        primary: isAlign ? toNum(r['Job-Aligned Count']) : (toNum(r['Employed Count']) + toNum(r['Self-Employed Count'])),
        secondary: isAlign ? toNum(r['Employed Count']) : toNum(r['Total Graduates']),
      })),
      primarySeriesName: isAlign ? 'Job-Aligned' : 'Employed',
      secondarySeriesName: isAlign ? 'Total Employed' : 'Total Graduates',
    };
  }

  if (reportId === 'batch-employment') {
    const totalGrads = rows.reduce((s, r) => s + toNum(r['Graduates Tracked']), 0);
    const totalEmployed = rows.reduce((s, r) => s + toNum(r['Employed Graduates']), 0);
    const totalNotRep = rows.reduce((s, r) => s + toNum(r['Not Reported']), 0);
    return {
      kpis: [
        { label: 'Graduation Cohorts', value: total.toLocaleString(), subtext: `${totalGrads} total graduates`, tone: 'blue' },
        { label: 'Employed Across Cohorts', value: `${totalEmployed} (${pct(totalEmployed, totalGrads)}%)`, subtext: 'Tracked employed graduates', tone: 'emerald' },
        { label: 'Not Reported Status', value: totalNotRep.toLocaleString(), subtext: 'Pending cohort outreach', tone: 'amber' },
        { label: 'Batches With Gaps', value: incompleteCount.toLocaleString(), subtext: `${completeCount} complete cohorts`, tone: 'rose' },
      ],
      chartTitle: 'Employment Outcomes by Graduation Batch',
      chartSubtitle: 'Employed vs. Not Reported counts across graduating years',
      chartData: [...rows]
        .sort((a, b) => Number(a['Graduation Batch']) - Number(b['Graduation Batch']))
        .map((r) => ({
          name: String(r['Graduation Batch'] || 'N/A'),
          primary: toNum(r['Employed Graduates']),
          secondary: toNum(r['Not Reported']),
        })),
      primarySeriesName: 'Employed',
      secondarySeriesName: 'Not Reported',
    };
  }

  if (reportId === 'employer') {
    const verified = rows.filter((r) => String(r['Verification Status'] || '').toLowerCase() === 'verified partner').length;
    const openJobs = rows.reduce((s, r) => s + toNum(r['Active Job Openings']), 0);
    const hires = rows.reduce((s, r) => s + toNum(r['Alumni Currently Employed']), 0);
    return {
      kpis: [
        { label: 'Registered Partners', value: total.toLocaleString(), subtext: `${verified} verified (${pct(verified, total)}%)`, tone: 'rose' },
        { label: 'Alumni Employed There', value: hires.toLocaleString(), subtext: 'Active placements at partners', tone: 'emerald' },
        { label: 'Active Job Openings', value: openJobs.toLocaleString(), subtext: 'Listed on Job Board', tone: 'blue' },
        { label: 'Needs Action (Missing Data)', value: incompleteCount.toLocaleString(), subtext: `${completenessPct}% partner completeness`, tone: 'amber' },
      ],
      chartTitle: 'Partner Companies: Openings vs. Alumni Hired',
      chartSubtitle: 'Top partner companies by active vacancies and alumni placements',
      chartData: rows.slice(0, 8).map((r) => ({
        name: String(r['Company Name'] || '').slice(0, 16),
        primary: toNum(r['Alumni Currently Employed']),
        secondary: toNum(r['Active Job Openings']),
      })),
      primarySeriesName: 'Alumni Hired',
      secondarySeriesName: 'Active Jobs',
    };
  }

  if (reportId === 'surveys') {
    const active = rows.filter((r) => String(r['Active Status'] || '').toLowerCase() === 'active').length;
    const totalResp = rows.reduce((s, r) => s + toNum(r['Total Responses']), 0);
    const totalTarget = rows.reduce((s, r) => s + toNum(r['Target Alumni']), 0);
    return {
      kpis: [
        { label: 'Tracer Survey Cycles', value: total.toLocaleString(), subtext: `${active} currently active`, tone: 'blue' },
        { label: 'Total Responses', value: totalResp.toLocaleString(), subtext: `Across ${totalTarget} targeted slots`, tone: 'emerald' },
        { label: 'Cycles On Target', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} >= 50% completion`, tone: 'purple' },
        { label: 'Low-Turnout Cycles', value: incompleteCount.toLocaleString(), subtext: 'Need response reminders', tone: 'rose' },
      ],
      chartTitle: 'Survey Responses vs. Target Alumni',
      chartSubtitle: 'Response volume comparison across tracer study cycles',
      chartData: rows.slice(0, 6).map((r) => ({
        name: String(r['Survey Title'] || '').slice(0, 18),
        primary: toNum(r['Total Responses']),
        secondary: toNum(r['Target Alumni']),
      })),
      primarySeriesName: 'Responses',
      secondarySeriesName: 'Target Alumni',
    };
  }

  if (reportId === 'skills') {
    const totalMentions = rows.reduce((s, r) => s + toNum(r['Alumni Count']), 0);
    const totalVerified = rows.reduce((s, r) => s + toNum(r['Verified Skills Count']), 0);
    const top = [...rows].sort((a, b) => toNum(b['Alumni Count']) - toNum(a['Alumni Count'])).slice(0, 8);
    return {
      kpis: [
        { label: 'Unique Skills Listed', value: total.toLocaleString(), subtext: `${totalMentions} alumni skill entries`, tone: 'amber' },
        { label: 'Verified Endorsements', value: totalVerified.toLocaleString(), subtext: 'Verified skill records', tone: 'emerald' },
        { label: 'Record Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} rated & verified`, tone: 'blue' },
        { label: 'Needs Rating / Proof', value: incompleteCount.toLocaleString(), subtext: 'Missing proficiency or verification', tone: 'rose' },
      ],
      chartTitle: 'Top Alumni Skills & Competencies',
      chartSubtitle: 'Most frequently reported skills across registered alumni',
      chartData: top.map((r) => ({
        name: String(r['Skill Name'] || '').slice(0, 16),
        primary: toNum(r['Alumni Count']),
        secondary: toNum(r['Verified Skills Count']),
      })),
      primarySeriesName: 'Alumni Count',
      secondarySeriesName: 'Verified Count',
    };
  }

  if (reportId === 'jobs') {
    const totalApps = rows.reduce((s, r) => s + toNum(r['Total Applicants']), 0);
    const totalAccepted = rows.reduce((s, r) => s + toNum(r['Accepted Hires']), 0);
    const totalPending = rows.reduce((s, r) => s + toNum(r['Pending Review']), 0);
    return {
      kpis: [
        { label: 'Total Job Postings', value: total.toLocaleString(), subtext: `${totalAccepted} accepted hires`, tone: 'blue' },
        { label: 'Total Applications', value: totalApps.toLocaleString(), subtext: `${totalPending} awaiting review`, tone: 'emerald' },
        { label: 'Posting Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} complete & active`, tone: 'amber' },
        { label: 'Needs Attention', value: incompleteCount.toLocaleString(), subtext: '0 applicants, no salary, or pending review', tone: 'rose' },
      ],
      chartTitle: 'Applications & Hires by Job Vacancy',
      chartSubtitle: 'Applicant demand across latest institutional job postings',
      chartData: rows.slice(0, 8).map((r) => ({
        name: String(r['Position Title'] || '').slice(0, 16),
        primary: toNum(r['Total Applicants']),
        secondary: toNum(r['Accepted Hires']),
      })),
      primarySeriesName: 'Applicants',
      secondarySeriesName: 'Accepted Hires',
    };
  }

  // Generic / career-progress / survey-responses / system-master
  const byCategory: Record<string, { complete: number; incomplete: number }> = {};
  rows.forEach((r, idx) => {
    const bucketRaw =
      r['Degree Program'] ||
      r['Program'] ||
      r['Industry'] ||
      r['Role Status'] ||
      r['Survey Title'] ||
      'All Records';
    const bucket = shortProgramName(String(bucketRaw));
    if (!byCategory[bucket]) byCategory[bucket] = { complete: 0, incomplete: 0 };
    // filled later via analyzedRows count estimate
    void idx;
    byCategory[bucket].complete++;
  });

  return {
    kpis: [
      { label: 'Total Live Records', value: total.toLocaleString(), subtext: 'From active database', tone: 'blue' },
      { label: 'Data Completeness', value: `${completenessPct}%`, subtext: `${completeCount} / ${total} complete`, tone: 'emerald' },
      { label: 'Complete Entries', value: completeCount.toLocaleString(), subtext: 'Ready for institutional export', tone: 'indigo' },
      { label: 'Needs Action (Missing Data)', value: incompleteCount.toLocaleString(), subtext: 'Have missing or pending fields', tone: 'rose' },
    ],
    chartTitle: 'Dataset Volume Breakdown',
    chartSubtitle: 'Distribution of records across categories / cohorts',
    chartData: Object.entries(byCategory)
      .slice(0, 8)
      .map(([name, v]) => ({ name, primary: v.complete })),
    primarySeriesName: 'Records',
  };
}

export function analyzeReportDataset(reportId: string, payload: any): ReportAnalysisResult {
  const rows = normalizeReportRows(reportId, payload);
  const rules = getGapRules(reportId);

  const analyzedRows: AnalyzedRow[] = rows.map((row, index) => {
    const matched = rules.filter((rule) => rule.isMissing(row));
    return {
      index,
      row,
      missingKeys: matched.map((m) => m.key),
      missingLabels: matched.map((m) => m.label),
      isComplete: matched.length === 0,
    };
  });

  const completeCount = analyzedRows.filter((r) => r.isComplete).length;
  const incompleteCount = rows.length - completeCount;
  const completenessPct = pct(completeCount, rows.length);

  const missingGroups: MissingGapGroup[] = rules
    .map((rule) => {
      const count = analyzedRows.filter((ar) => ar.missingKeys.includes(rule.key)).length;
      return {
        key: rule.key,
        label: rule.label,
        count,
        pct: pct(count, rows.length),
        severity: rule.severity,
        userAction: rule.userAction,
        adminAction: rule.adminAction,
      };
    })
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  const userSteps = Array.from(new Set(missingGroups.map((g) => g.userAction)));
  const adminSteps = Array.from(new Set(missingGroups.map((g) => g.adminAction)));

  const { kpis, chartTitle, chartSubtitle, chartData, primarySeriesName, secondarySeriesName } =
    buildChartAndKpis(reportId, rows, payload, completeCount, incompleteCount);

  return {
    rows,
    analyzedRows,
    completeCount,
    incompleteCount,
    completenessPct,
    kpis,
    chartTitle,
    chartSubtitle,
    chartData,
    primarySeriesName,
    secondarySeriesName,
    fieldCoverage: buildFieldCoverage(rows),
    missingGroups,
    userSteps,
    adminSteps,
  };
}
