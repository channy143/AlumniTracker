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

export const ALUMNI_TOUR_STEPS: TourStep[] = [
  {
    id: 'feed-composer',
    targetSelector: '[data-tour="feed-composer"]',
    route: '/',
    badge: '💬 Community Feed Composer',
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
    badge: '💼 Portal Navigation',
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
    badge: '📊 4-Pillar Readiness Tracker',
    title: 'Your Profile Completion Meter',
    content:
      'This meter measures the 4 essential parts of your profile: Personal Information, Education History, Skills Inventory, and Employment Status. Reaching 100% unlocks verified alumni credentials and prioritizes your profile for job referrals and partner hiring events.',
    pointingDirection: 'left',
    actionText: 'Go to My Profile →',
  },
  {
    id: 'profile-header',
    targetSelector: '[data-tour="profile-header-card"]',
    route: '/profile',
    badge: '👤 Verified Alumni Identity',
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
    badge: '🏢 Updating Employment Status',
    title: 'Keep Your Career Status Verified',
    content:
      'Whenever your career situation changes, click "Edit Profile". Here you can update your status to Employed, Self-employed, or Seeking Opportunities, along with your current position, employer name, industry sector, and monthly compensation bracket.',
    pointingDirection: 'bottom',
    actionText: 'Next: Q-Pro Accreditation →',
  },
  {
    id: 'profile-accreditation',
    targetSelector: '[data-tour="profile-accreditation-card"]',
    route: '/profile',
    badge: '🏆 Institutional Q-Pro',
    title: 'Accreditation Placement Proof',
    content:
      'CTU-Naga is mandated by CHED, AACCUP, and PESO to verify graduate placement outcomes. In the Edit form, upload your Certificate of Employment (COE), Company ID, or Contract. Once verified by campus administrators, your employment status validates university performance ratings while your personal data remains strictly protected.',
    pointingDirection: 'top',
    actionText: 'Next: Privacy Controls',
  },
  {
    id: 'profile-privacy-tab',
    targetSelector: '[data-tour="profile-privacy-card"]',
    route: '/profile',
    badge: '🔒 RA 10173 Compliant',
    title: 'Directory Visibility & Privacy Safeguards',
    content:
      'Under Republic Act 10173 (Data Privacy Act of 2012), you control your public presence. These toggles let you choose whether fellow alumni in the Alumni Directory can see your Email Address, Phone Number, and Residential Address. Sensitive records like your salary bracket and student ID are strictly confidential and permanently hidden.',
    pointingDirection: 'top',
    actionText: 'Finish Tutorial 🎉',
  },
  {
    id: 'tour-celebration',
    targetSelector: '',
    route: '/profile',
    badge: '🚀 Orientation Complete',
    title: "You're Ready to Connect, Naga Alumni!",
    content:
      'Congratulations! You now know how to navigate the portal, connect with fellow graduates, and keep your employment status certified. You can replay this interactive tutorial anytime from your account menu in the top-right header.',
    pointingDirection: 'none',
    actionText: 'Explore Alumni Portal 🎓',
  },
];
