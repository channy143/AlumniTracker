export interface TourStep {
  id: string;
  targetSelector: string;
  route: string;
  badge: string;
  title: string;
  content: string;
  pointingDirection: 'top' | 'bottom' | 'left' | 'right' | 'none';
  actionText?: string;
}

// Default FTUE onboarding tour for alumni
export const ALUMNI_TOUR_STEPS: TourStep[] = [
  {
    id: 'feed-composer',
    targetSelector: '[data-tour="feed-composer"]',
    route: '/',
    badge: 'Community Feed Composer',
    title: 'Share Milestones, Referrals & Inquiries',
    content:
      'Use this composer to publish updates to your fellow alumni. Share open job opportunities from your current employer, announce board exam results or certifications, celebrate career milestones, or start discussions across batches.',
    pointingDirection: 'bottom',
    actionText: 'Next: Explore Features',
  },
  {
    id: 'sidebar-nav',
    targetSelector: '[data-tour="sidebar-nav"]',
    route: '/',
    badge: 'Portal Navigation',
    title: 'Jobs, Career Trends & Directory',
    content:
      'Use the navigation sidebar to jump between features: "Jobs" for university-partnered vacancies, "Career Trends" for Cebu labor market benchmarks and course alignments, "Directory" to reconnect with batchmates, and "Tracer Surveys" for campus feedback.',
    pointingDirection: 'right',
    actionText: 'Next: Profile Status',
  },
  {
    id: 'profile-completion',
    targetSelector: '[data-tour="profile-completion-card"]',
    route: '/',
    badge: '4-Pillar Readiness Tracker',
    title: 'Your Profile Completion Meter',
    content:
      'This meter measures the 4 essential parts of your profile: Personal Information, Education History, Skills Inventory, and Employment Status. Reaching 100% unlocks verified alumni credentials and prioritizes your profile for job referrals and partner hiring events.',
    pointingDirection: 'left',
    actionText: 'Go to My Profile',
  },
  {
    id: 'profile-header',
    targetSelector: '[data-tour="profile-header-card"]',
    route: '/profile',
    badge: 'Verified Alumni Identity',
    title: 'Your Official Alumni Profile Banner',
    content:
      'This banner presents your permanent academic degree (e.g., Bachelor of Secondary Education), batch year, graduation honors, student ID, and live contact details. You can also update your professional avatar and view your active alumni standing.',
    pointingDirection: 'bottom',
    actionText: 'Next: Update Employment',
  },
  {
    id: 'profile-edit-btn',
    targetSelector: '[data-tour="profile-edit-btn"]',
    route: '/profile',
    badge: 'Updating Employment Status',
    title: 'Keep Your Career Status Verified',
    content:
      'Whenever your career situation changes, click "Edit Profile". Here you can update your status to Employed, Self-employed, or Seeking Opportunities, along with your position, company, and accreditation placement proof.',
    pointingDirection: 'bottom',
    actionText: 'Open Edit Form',
  },
  {
    id: 'profile-edit-modal-status',
    targetSelector: '[data-tour="profile-edit-employment-section"]',
    route: '/profile',
    badge: 'Career Status Settings',
    title: 'Update Your Employment Details',
    content:
      'Inside this editor, maintain your active career record. Select whether you are Employed, Self-employed, or Seeking Opportunities, and input your position, employer, industry sector, and compensation bracket.',
    pointingDirection: 'bottom',
    actionText: 'Next: Q-Pro Proof',
  },
  {
    id: 'profile-edit-modal-proof',
    targetSelector: '[data-tour="profile-proof-section"]',
    route: '/profile',
    badge: 'Institutional Q-Pro',
    title: 'Accreditation Placement Proof',
    content:
      'CTU-Naga is mandated by CHED, AACCUP, and PESO to verify graduate placement outcomes. In this section, choose your proof type (COE, Company ID, Payslip, or Contract) and upload your file or provide a link. Once verified by campus administrators, your placement validates institutional ratings while remaining strictly confidential under RA 10173.',
    pointingDirection: 'top',
    actionText: 'Next: Privacy Controls',
  },
  {
    id: 'profile-privacy-tab',
    targetSelector: '[data-tour="profile-privacy-card"]',
    route: '/profile',
    badge: 'RA 10173 Compliant',
    title: 'Directory Visibility & Privacy Safeguards',
    content:
      'Under Republic Act 10173 (Data Privacy Act of 2012), you control your public presence. These toggles let you choose whether fellow alumni in the Alumni Directory can see your Email Address, Phone Number, and Residential Address. Sensitive records like your salary bracket and student ID are strictly confidential and permanently hidden.',
    pointingDirection: 'top',
    actionText: 'Finish Tutorial',
  },
  {
    id: 'tour-celebration',
    targetSelector: '',
    route: '/profile',
    badge: 'Orientation Complete',
    title: "You're Ready to Connect, Naga Alumni!",
    content:
      'Congratulations! You now know how to navigate the portal, connect with fellow graduates, and keep your employment status certified. You can replay this interactive tutorial anytime from your account menu in the top-right header.',
    pointingDirection: 'none',
    actionText: 'Explore Alumni Portal',
  },
];

// Admin Dashboard Walkthrough
export const ADMIN_DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'admin-year-filter',
    targetSelector: '[data-tour="admin-year-filter"]',
    route: '/admin',
    badge: 'Graduation Batch Filter',
    title: 'Filter Dashboard by Year or Batch',
    content:
      'Use this selector to slice the entire dashboard by graduation batch (e.g., 2026, 2025, 2024) or choose "All Years" to view institutional totals. Clicking the left and right chevrons steps sequentially through available batches, instantly updating all KPI cards and summary charts.',
    pointingDirection: 'bottom',
    actionText: 'Next: KPI Cards',
  },
  {
    id: 'admin-kpi-grid',
    targetSelector: '[data-tour="admin-kpi-grid"]',
    route: '/admin',
    badge: 'Executive KPI Cards',
    title: 'Institutional Performance & Outcomes',
    content:
      'These 8 cards display live executive metrics: Total Alumni, Employment Rate (matching Career Analytics), Tracer Survey Completion Rate, Average Monthly Salary, Time to Employment, Active Tracer Surveys, Registered Alumni for the selected year, and Partner Companies. Clicking any card takes you directly to its detailed management or analytics page.',
    pointingDirection: 'bottom',
    actionText: 'Next: Quick Actions',
  },
  {
    id: 'admin-quick-actions',
    targetSelector: '[data-tour="admin-quick-actions"]',
    route: '/admin',
    badge: 'Admin Shortcuts',
    title: 'Quick Actions Carousel',
    content:
      'Fast-track your administrative tasks from this carousel! Click "Create Announcement" to broadcast campus news, "Create Event" to schedule alumni gatherings, "Create Tracer Survey" to deploy questionnaires, or "Generate Report" to export compliance documents.',
    pointingDirection: 'top',
    actionText: 'Next: Summary Widgets',
  },
  {
    id: 'admin-summary-widgets',
    targetSelector: '[data-tour="admin-summary-widgets"]',
    route: '/admin',
    badge: 'Dashboard Summary',
    title: 'Real-time Analytical Snapshots',
    content:
      'Monitor live operational data: Employment Status distribution donut, Degree Work Alignment rate, Tracer Survey collection progress for the selected batch, Upcoming Events, Audit & Moderation activity log, and Top Skills reported in the workplace.',
    pointingDirection: 'top',
    actionText: 'Complete Guide',
  },
  {
    id: 'admin-dashboard-complete',
    targetSelector: '',
    route: '/admin',
    badge: 'Dashboard Guide Complete',
    title: "You're All Set with the Admin Dashboard!",
    content:
      'You are now ready to oversee alumni employment, slice institutional data by graduation batches, and launch campus initiatives. You can click the Question Mark icon anytime to reopen this guide.',
    pointingDirection: 'none',
    actionText: 'Got It!',
  },
];

// Alumni Management Walkthrough
export const ALUMNI_MANAGEMENT_TOUR_STEPS: TourStep[] = [
  {
    id: 'alumni-top-actions',
    targetSelector: '[data-tour="alumni-top-actions"]',
    route: '/admin/alumni',
    badge: 'Roster Actions',
    title: 'Export Data & Add Graduates',
    content:
      'Use "Export CSV" to download filtered alumni rosters for CHED or PESO compliance reports. Click "+ Add Alumni" to manually register an alumnus, or "+ Eligible Alumni" to import graduating lists from the registrar ready for students to claim.',
    pointingDirection: 'bottom',
    actionText: 'Next: Roster Tabs',
  },
  {
    id: 'alumni-tabs',
    targetSelector: '[data-tour="alumni-tabs"]',
    route: '/admin/alumni',
    badge: 'Roster Slicing',
    title: 'Registered vs Eligible Records',
    content:
      'Switch between "Registered" (graduates who have activated their account) and "Eligible / Unclaimed" (pre-registered student records awaiting graduate claiming during onboarding).',
    pointingDirection: 'bottom',
    actionText: 'Next: Filter Bar',
  },
  {
    id: 'alumni-search-filter',
    targetSelector: '[data-tour="alumni-search-filter"]',
    route: '/admin/alumni',
    badge: 'Search & Filters',
    title: 'Multi-Criteria Graduate Search',
    content:
      'Search alumni by full name, student ID number, or email. Filter by Academic Program (BSIT, BIT, BEEd, BSEd-Math, BTLED), Graduation Batch, Employment Status, Employer, and Active/Archived status.',
    pointingDirection: 'bottom',
    actionText: 'Next: Alumni Cards',
  },
  {
    id: 'alumni-grid',
    targetSelector: '[data-tour="alumni-grid"]',
    route: '/admin/alumni',
    badge: 'Graduate Directory Cards',
    title: 'Alumni Credentials & Current Status',
    content:
      'Each card summarizes the graduate\'s credentials: degree program, graduation batch, student ID, employer, email, and live employment status badge (Employed, Self-employed, Seeking Opportunities).',
    pointingDirection: 'top',
    actionText: 'Next: Card Controls',
  },
  {
    id: 'alumni-card-actions',
    targetSelector: '[data-tour="alumni-card-actions"]',
    route: '/admin/alumni',
    badge: 'Management Controls',
    title: 'View Details, Verify & Archive',
    content:
      'Click "View" to open full alumni records and inspect submitted Q-Pro accreditation documents (COE, Company ID, Payslip, Contract). Click "Verify" to certify their alumni status, or "Archive" to soft-delete inactive accounts.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Career Analytics Walkthrough
export const CAREER_ANALYTICS_TOUR_STEPS: TourStep[] = [
  {
    id: 'analytics-tabs',
    targetSelector: '[data-tour="analytics-tabs"]',
    route: '/admin/analytics',
    badge: 'Analytics Modes',
    title: 'Career Outcomes vs Q-Pro Accreditation',
    content:
      'Toggle between "Career Analytics Overview" for institutional employment outcomes and "Accreditation & Q-Pro Roster" to audit graduate employment proof documents required by CHED, AACCUP, and PESO.',
    pointingDirection: 'bottom',
    actionText: 'Next: Filters',
  },
  {
    id: 'analytics-filters',
    targetSelector: '[data-tour="analytics-filters"]',
    route: '/admin/analytics',
    badge: 'Demographic Slicing',
    title: 'Filter Outcomes by Batch, Course & Sector',
    content:
      'Slice labor market metrics by Academic Year, Graduation Batch, Degree Program, Employment Status, Job Type, Industry Sector, or custom date ranges. All charts update in real-time.',
    pointingDirection: 'bottom',
    actionText: 'Next: Outcome KPIs',
  },
  {
    id: 'analytics-kpis',
    targetSelector: '[data-tour="analytics-kpis"]',
    route: '/admin/analytics',
    badge: 'Employability Benchmarks',
    title: 'Core Outcome Key Indicators',
    content:
      'Track institutional benchmarks: Employment Rate, Unemployment Rate, Average Monthly Salary, Time to Employment, Work Alignment Rate with degree programs, Average Experience, and Tracer Survey Response Rate.',
    pointingDirection: 'bottom',
    actionText: 'Next: Visualizations',
  },
  {
    id: 'analytics-charts',
    targetSelector: '[data-tour="analytics-charts"]',
    route: '/admin/analytics',
    badge: 'Market Visualizations',
    title: 'Industry Breakdown & Institutional Ratings',
    content:
      'Analyze interactive charts: Employment Status distribution, Employment Type (Full-time vs Self-employed), and Institutional Satisfaction ratings across Faculty Instruction, Campus Labs, and Student Services.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Curriculum Insights Walkthrough
export const CURRICULUM_INSIGHTS_TOUR_STEPS: TourStep[] = [
  {
    id: 'curriculum-header-actions',
    targetSelector: '[data-tour="curriculum-header-actions"]',
    route: '/admin/curriculum',
    badge: 'Export Tools',
    title: 'Export Evaluation Reports',
    content:
      'Click "PDF", "Excel", or "CSV" to export formal curriculum evaluation reports. Use "Refresh" to recalculate analytics whenever new graduate tracer surveys are submitted.',
    pointingDirection: 'bottom',
    actionText: 'Next: Curriculum Filters',
  },
  {
    id: 'curriculum-filters',
    targetSelector: '[data-tour="curriculum-filters"]',
    route: '/admin/curriculum',
    badge: 'Program Slicing',
    title: 'Filter by Degree Program & Cohort',
    content:
      'Filter curriculum datasets by Academic Program (BSIT, BIT, BEEd, BSEd-Math, BTLED) and Graduation Batch to assess how well university syllabi prepare students for the workplace.',
    pointingDirection: 'bottom',
    actionText: 'Next: Evaluation KPIs',
  },
  {
    id: 'curriculum-kpis',
    targetSelector: '[data-tour="curriculum-kpis"]',
    route: '/admin/curriculum',
    badge: 'Readiness Scores',
    title: 'Curriculum Preparation & Alignment',
    content:
      'Review key institutional benchmarks: Curriculum Preparation Score, Degree-Job Alignment percentage, Licensure Exam passing rates, and Average Graduate Satisfaction on program relevance.',
    pointingDirection: 'bottom',
    actionText: 'Next: Skills Gaps',
  },
  {
    id: 'curriculum-skills',
    targetSelector: '[data-tour="curriculum-skills"]',
    route: '/admin/curriculum',
    badge: 'Competency Analysis',
    title: 'Skills Used at Work vs Industry Gaps',
    content:
      'Compare high-frequency competencies alumni use in their daily careers against skills identified as missing. Use this data during academic curriculum review committees.',
    pointingDirection: 'top',
    actionText: 'Next: Recommendations',
  },
  {
    id: 'curriculum-recommendations',
    targetSelector: '[data-tour="curriculum-recommendations"]',
    route: '/admin/curriculum',
    badge: 'Alumni Voice',
    title: 'Subject Suggestions & Syllabus Feedback',
    content:
      'Read direct recommendations from employed graduates on subjects to introduce, technical electives needed in industry, and suggested laboratory upgrades.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Graduate Tracer Surveys Walkthrough
export const GRADUATE_TRACER_SURVEYS_TOUR_STEPS: TourStep[] = [
  {
    id: 'surveys-toolbar',
    targetSelector: '[data-tour="surveys-toolbar"]',
    route: '/admin/surveys',
    badge: 'Tracer Survey Control',
    title: 'Filter & Search Tracer Studies',
    content:
      'Filter tracer surveys by status (Active, Closed, Draft) and search surveys by title. Click "+ Create Tracer Survey" to launch a new survey instrument targeted to specific graduating batches.',
    pointingDirection: 'bottom',
    actionText: 'Next: Create Survey',
  },
  {
    id: 'surveys-create-btn',
    targetSelector: '[data-tour="surveys-create-btn"]',
    route: '/admin/surveys',
    badge: 'Survey Builder',
    title: 'Launch New Tracer Questionnaires',
    content:
      'Build new surveys with customized questions, rating scales, and demographic fields. Target all alumni or specific graduating batches with automated notifications.',
    pointingDirection: 'bottom',
    actionText: 'Next: Survey Roster',
  },
  {
    id: 'surveys-list',
    targetSelector: '[data-tour="surveys-list"]',
    route: '/admin/surveys',
    badge: 'Response Tracking',
    title: 'Monitor Responses & Compliance Rates',
    content:
      'Track live response counts, target graduate numbers, and compliance percentages for each tracer survey. You can preview the survey, edit questions, or close completed surveys.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Campus & Alumni Events Walkthrough
export const ADMIN_EVENTS_TOUR_STEPS: TourStep[] = [
  {
    id: 'events-header-actions',
    targetSelector: '[data-tour="events-header-actions"]',
    route: '/admin/events',
    badge: 'Event Management',
    title: 'Schedule Alumni & Campus Activities',
    content:
      'Filter between "Upcoming" and "Past" events, or click "+ New Event" to schedule homecomings, job fairs, webinars, or campus reunions with custom banner uploads.',
    pointingDirection: 'bottom',
    actionText: 'Next: Event List',
  },
  {
    id: 'events-list',
    targetSelector: '[data-tour="events-list"]',
    route: '/admin/events',
    badge: 'Event Calendar',
    title: 'Manage Scheduled Gatherings',
    content:
      'View all scheduled activities with date, time, location, and banner image. Click "Edit" to modify event details or "Delete" to cancel an event.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Announcements Walkthrough
export const ANNOUNCEMENT_MANAGEMENT_TOUR_STEPS: TourStep[] = [
  {
    id: 'announcements-header-actions',
    targetSelector: '[data-tour="announcements-header-actions"]',
    route: '/admin/announcements',
    badge: 'Broadcast News',
    title: 'Publish Campus Bulletins & Alerts',
    content:
      'Click "+ Create Announcement" to broadcast news, job openings, and university memos. Attach official banner artwork via file upload and target specific graduating classes.',
    pointingDirection: 'bottom',
    actionText: 'Next: Bulletins Feed',
  },
  {
    id: 'announcements-list',
    targetSelector: '[data-tour="announcements-list"]',
    route: '/admin/announcements',
    badge: 'Published Feed',
    title: 'Manage Live Announcements',
    content:
      'View active, scheduled, or expired announcements. Edit content, update banners, pin important alerts to the top of the feed, or delete outdated posts.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Partner Companies Walkthrough
export const COMPANY_MANAGEMENT_TOUR_STEPS: TourStep[] = [
  {
    id: 'companies-header-actions',
    targetSelector: '[data-tour="companies-header-actions"]',
    route: '/admin/companies',
    badge: 'Industry Partnerships',
    title: 'Register Partner Employers',
    content:
      'Click "+ Add Partner Company" to register corporate employers. Use "Sync from Alumni" to automatically discover employers entered by graduates in their profiles, or "Export CSV" for partnership rosters.',
    pointingDirection: 'bottom',
    actionText: 'Next: Partner KPIs',
  },
  {
    id: 'companies-kpi-grid',
    targetSelector: '[data-tour="companies-kpi-grid"]',
    route: '/admin/companies',
    badge: 'Partnership Metrics',
    title: 'Corporate Network Overview',
    content:
      'Monitor total corporate affiliations, certified MOU/MOA partnerships, pending agreement verifications, and active hiring partners across industries.',
    pointingDirection: 'bottom',
    actionText: 'Next: Companies Directory',
  },
  {
    id: 'companies-list',
    targetSelector: '[data-tour="companies-list"]',
    route: '/admin/companies',
    badge: 'Corporate Roster',
    title: 'Track Partner Companies & Hiring Ties',
    content:
      'Browse hiring partners, verify partnership agreement documents, record MOA validity dates, and inspect which companies employ the highest number of CTU-Naga graduates.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Job Management Walkthrough
export const JOB_MANAGEMENT_TOUR_STEPS: TourStep[] = [
  {
    id: 'jobs-header-actions',
    targetSelector: '[data-tour="jobs-header-actions"]',
    route: '/admin/jobs',
    badge: 'Career Opportunities',
    title: 'Publish & Manage Vacancies',
    content:
      'Click "+ Post Job" to publish vacancies from partner companies. Set job qualifications, degree requirements, salary brackets, and application links.',
    pointingDirection: 'bottom',
    actionText: 'Next: Job KPIs',
  },
  {
    id: 'jobs-kpi-grid',
    targetSelector: '[data-tour="jobs-kpi-grid"]',
    route: '/admin/jobs',
    badge: 'Vacancy Metrics',
    title: 'Job Market Overview',
    content:
      'Track total active vacancies, available openings, and registered employers offering opportunities to CTU-Naga graduates.',
    pointingDirection: 'bottom',
    actionText: 'Next: Filter Vacancies',
  },
  {
    id: 'jobs-filters',
    targetSelector: '[data-tour="jobs-filters"]',
    route: '/admin/jobs',
    badge: 'Job Filters',
    title: 'Filter Postings by Status & Keyword',
    content:
      'Filter job opportunities by active or expired status, or search by job title, company name, and required skills.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Audit & Activity Logs Walkthrough
export const ADMIN_ACTIVITY_TOUR_STEPS: TourStep[] = [
  {
    id: 'activity-tabs',
    targetSelector: '[data-tour="activity-tabs"]',
    route: '/admin/activity',
    badge: 'Security & Moderation',
    title: 'Audit Logs & Alumni Reports',
    content:
      'Switch between "Audit & Activity Logs" for administrative and security events, and "Alumni Reports & Moderation" to review and take action on flagged posts or content.',
    pointingDirection: 'bottom',
    actionText: 'Next: Activity Trail',
  },
  {
    id: 'activity-logs',
    targetSelector: '[data-tour="activity-logs"]',
    route: '/admin/activity',
    badge: 'Audit Trail',
    title: 'Immutable System Activity Records',
    content:
      'Inspect real-time audit trails recording logins, credential verifications, moderation actions, and data updates for total transparency and RA 10173 governance.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Reports & Exports Walkthrough
export const REPORTS_TOUR_STEPS: TourStep[] = [
  {
    id: 'reports-tabs',
    targetSelector: '[data-tour="reports-tabs"]',
    route: '/admin/reports',
    badge: 'Accreditation Reports',
    title: 'CHED, AACCUP & PESO Report Standards',
    content:
      'Access pre-formatted report templates tailored for Commission on Higher Education (CHED), AACCUP institutional accreditation, or PESO employment filings.',
    pointingDirection: 'bottom',
    actionText: 'Next: Report Exports',
  },
  {
    id: 'reports-list',
    targetSelector: '[data-tour="reports-list"]',
    route: '/admin/reports',
    badge: 'Document Generation',
    title: 'Download Official PDF & Excel Files',
    content:
      'Generate print-ready executive PDF summaries or export raw datasets in Excel/CSV for institutional research and compliance auditing.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Alumni Community Feed Walkthrough
export const ALUMNI_FEED_TOUR_STEPS: TourStep[] = [
  {
    id: 'feed-composer',
    targetSelector: '[data-tour="feed-composer"]',
    route: '/',
    badge: 'Community Feed Composer',
    title: 'Share Milestones, Referrals & Inquiries',
    content:
      'Use this composer to publish updates to your fellow alumni. Share open job opportunities from your current employer, announce board exam results or certifications, celebrate career milestones, or start discussions across batches.',
    pointingDirection: 'bottom',
    actionText: 'Next: Portal Navigation',
  },
  {
    id: 'sidebar-nav',
    targetSelector: '[data-tour="sidebar-nav"]',
    route: '/',
    badge: 'Portal Navigation',
    title: 'Jobs, Career Trends & Directory',
    content:
      'Use the navigation sidebar to jump between features: "Jobs" for university-partnered vacancies, "Career Trends" for Cebu labor market benchmarks and course alignments, "Directory" to reconnect with batchmates, and "Tracer Surveys" for campus feedback.',
    pointingDirection: 'right',
    actionText: 'Next: Profile Status',
  },
  {
    id: 'profile-completion',
    targetSelector: '[data-tour="profile-completion-card"]',
    route: '/',
    badge: '4-Pillar Readiness Tracker',
    title: 'Your Profile Completion Meter',
    content:
      'This meter measures the 4 essential parts of your profile: Personal Information, Education History, Skills Inventory, and Employment Status. Reaching 100% unlocks verified alumni credentials and prioritizes your profile for job referrals and partner hiring events.',
    pointingDirection: 'left',
    actionText: 'Finish Guide',
  },
];

// Alumni Profile Walkthrough
export const ALUMNI_PROFILE_TOUR_STEPS: TourStep[] = [
  {
    id: 'profile-header',
    targetSelector: '[data-tour="profile-header-card"]',
    route: '/profile',
    badge: 'Verified Alumni Identity',
    title: 'Your Official Alumni Profile Banner',
    content:
      'This banner presents your permanent academic degree, batch year, graduation honors, student ID, and live contact details. You can also update your professional avatar and view your active alumni standing.',
    pointingDirection: 'bottom',
    actionText: 'Next: Edit Career',
  },
  {
    id: 'profile-edit-btn',
    targetSelector: '[data-tour="profile-edit-btn"]',
    route: '/profile',
    badge: 'Updating Employment Status',
    title: 'Keep Your Career Status Verified',
    content:
      'Whenever your career situation changes, click "Edit Profile". Here you can update your status to Employed, Self-employed, or Seeking Opportunities, along with your position, company, and accreditation placement proof.',
    pointingDirection: 'bottom',
    actionText: 'Next: Q-Pro Proof',
  },
  {
    id: 'profile-proof-section',
    targetSelector: '[data-tour="profile-proof-section"]',
    route: '/profile',
    badge: 'Institutional Q-Pro',
    title: 'Accreditation Placement Proof',
    content:
      'CTU-Naga is mandated by CHED, AACCUP, and PESO to verify graduate placement outcomes. Choose your proof type (COE, Company ID, Payslip, or Contract) and upload your file or provide a link for official campus certification.',
    pointingDirection: 'top',
    actionText: 'Next: Privacy Controls',
  },
  {
    id: 'profile-privacy-card',
    targetSelector: '[data-tour="profile-privacy-card"]',
    route: '/profile',
    badge: 'RA 10173 Compliant',
    title: 'Directory Visibility & Privacy Safeguards',
    content:
      'Under Republic Act 10173 (Data Privacy Act of 2012), you control your public presence. Choose whether fellow alumni in the Alumni Directory can see your Email Address, Phone Number, and Residential Address.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Alumni Jobs Board Walkthrough
export const ALUMNI_JOBS_TOUR_STEPS: TourStep[] = [
  {
    id: 'jobs-search',
    targetSelector: '[data-tour="jobs-search"]',
    route: '/jobs',
    badge: 'Job Search',
    title: 'Find Partner Vacancies',
    content:
      'Search job openings by job title or company name, and filter by job type (Full-time, Part-time, Internship, Remote) and industry sector.',
    pointingDirection: 'bottom',
    actionText: 'Next: Job Listings',
  },
  {
    id: 'jobs-grid',
    targetSelector: '[data-tour="jobs-grid"]',
    route: '/jobs',
    badge: 'Partner Opportunities',
    title: 'Apply for Verified Openings',
    content:
      'Browse job opportunities partnered directly with CTU-Naga. View qualifications, salary ranges, and submit your application with a single click.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Alumni Directory Walkthrough
export const ALUMNI_DIRECTORY_TOUR_STEPS: TourStep[] = [
  {
    id: 'directory-search',
    targetSelector: '[data-tour="directory-search"]',
    route: '/directory',
    badge: 'Directory Search',
    title: 'Reconnect with CTU Naga Graduates',
    content:
      'Search fellow alumni by name, academic program (e.g., BSIT, BIT, BEEd), graduation year, employer, or city to find batchmates across years.',
    pointingDirection: 'bottom',
    actionText: 'Next: Graduate Roster',
  },
  {
    id: 'directory-grid',
    targetSelector: '[data-tour="directory-grid"]',
    route: '/directory',
    badge: 'Alumni Network',
    title: 'Connect & Network with Alumni',
    content:
      'View public graduate cards with verified degree badges. Connect, network, and message fellow graduates to build your professional circle.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

// Career Trends Walkthrough
export const CAREER_TRENDS_TOUR_STEPS: TourStep[] = [
  {
    id: 'career-trends-header',
    targetSelector: '[data-tour="career-trends-header"]',
    route: '/career-trends',
    badge: 'Market Benchmarks',
    title: 'Cebu Workforce & Salary Insights',
    content:
      'Discover current employment trends, top in-demand job roles for each degree program, and average salary brackets across Cebu and Region VII.',
    pointingDirection: 'bottom',
    actionText: 'Next: Role Profiles',
  },
  {
    id: 'career-trends-grid',
    targetSelector: '[data-tour="career-trends-grid"]',
    route: '/career-trends',
    badge: 'Role Explorer',
    title: 'Explore In-Demand Roles & Skills',
    content:
      'Click any role card to view essential industry competencies, top hiring employers, and career pathways for CTU-Naga graduates.',
    pointingDirection: 'top',
    actionText: 'Finish Guide',
  },
];

/**
 * Route-to-TourStep Resolver
 * Maps any pathname to its tailored walkthrough steps.
 */
export function getPageTourSteps(pathname: string): TourStep[] {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  // Admin Routes
  if (cleanPath === '/admin') {
    return ADMIN_DASHBOARD_TOUR_STEPS;
  }
  if (cleanPath === '/admin/alumni') {
    return ALUMNI_MANAGEMENT_TOUR_STEPS;
  }
  if (cleanPath === '/admin/analytics') {
    return CAREER_ANALYTICS_TOUR_STEPS;
  }
  if (cleanPath === '/admin/curriculum') {
    return CURRICULUM_INSIGHTS_TOUR_STEPS;
  }
  if (cleanPath === '/admin/surveys') {
    return GRADUATE_TRACER_SURVEYS_TOUR_STEPS;
  }
  if (cleanPath === '/admin/events') {
    return ADMIN_EVENTS_TOUR_STEPS;
  }
  if (cleanPath === '/admin/announcements') {
    return ANNOUNCEMENT_MANAGEMENT_TOUR_STEPS;
  }
  if (cleanPath === '/admin/companies') {
    return COMPANY_MANAGEMENT_TOUR_STEPS;
  }
  if (cleanPath === '/admin/jobs') {
    return JOB_MANAGEMENT_TOUR_STEPS;
  }
  if (cleanPath === '/admin/activity') {
    return ADMIN_ACTIVITY_TOUR_STEPS;
  }
  if (cleanPath === '/admin/reports' || cleanPath.startsWith('/admin/reports/')) {
    return REPORTS_TOUR_STEPS;
  }

  // Alumni Routes
  if (cleanPath === '/') {
    return ALUMNI_FEED_TOUR_STEPS;
  }
  if (cleanPath === '/profile') {
    return ALUMNI_PROFILE_TOUR_STEPS;
  }
  if (cleanPath === '/jobs') {
    return ALUMNI_JOBS_TOUR_STEPS;
  }
  if (cleanPath === '/directory' || cleanPath.startsWith('/directory/')) {
    return ALUMNI_DIRECTORY_TOUR_STEPS;
  }
  if (cleanPath === '/career-trends' || cleanPath.startsWith('/career-trends/')) {
    return CAREER_TRENDS_TOUR_STEPS;
  }

  // Fallback Contextual Tour for any other page
  return [
    {
      id: 'page-overview',
      targetSelector: '',
      route: cleanPath,
      badge: 'Page Guide',
      title: 'Guide to this Page',
      content:
        'This page provides specialized tools and data for CTU-Naga alumni operations. Use the top navigation or sidebar to switch sections, and click the Question Mark icon anytime to learn about specific features.',
      pointingDirection: 'none',
      actionText: 'Got It!',
    },
  ];
}
