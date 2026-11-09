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
    id: 'welcome',
    targetSelector: '[data-tour="dashboard-welcome"]',
    route: '/',
    badge: '🎓 Welcome to CTU-Naga',
    title: 'Welcome to Your Alumni Portal!',
    content:
      'Kumusta, Naga graduate! This quick interactive walkthrough introduces your new alumni hub. In just 1 minute, you will learn how to connect, find jobs, and keep your employment status verified.',
    pointingDirection: 'bottom',
    actionText: 'Begin Walkthrough →',
  },
  {
    id: 'feed-composer',
    targetSelector: '[data-tour="feed-composer"]',
    route: '/',
    badge: '💬 Community Feed',
    title: 'Share Milestones & Opportunities',
    content:
      'Use this composer to share career milestones, job referrals, or start discussions with fellow alumni across all batches and degree programs.',
    pointingDirection: 'top',
    actionText: 'Next: Explore Features',
  },
  {
    id: 'sidebar-nav',
    targetSelector: '[data-tour="sidebar-nav"]',
    route: '/',
    badge: '💼 Opportunities & Trends',
    title: 'Jobs, Trends & Network',
    content:
      'Explore verified job vacancies matching CTU degrees, explore career pathways and salary benchmarks, and discover former classmates in the Alumni Directory.',
    pointingDirection: 'right',
    actionText: 'Next: Profile Status',
  },
  {
    id: 'profile-completion',
    targetSelector: '[data-tour="profile-completion-card"]',
    route: '/',
    badge: '📊 Readiness Tracker',
    title: 'Track Your Profile Completion',
    content:
      'A complete profile unlocks verified alumni standing. Let us now jump to your Profile to see how to update your employment status and accreditation credentials!',
    pointingDirection: 'left',
    actionText: 'Go to My Profile →',
  },
  {
    id: 'profile-header',
    targetSelector: '[data-tour="profile-header-card"]',
    route: '/profile',
    badge: '👤 Alumni Identity',
    title: 'Your Official Alumni Profile',
    content:
      'This is your accredited alumni profile showcasing your degree, batch year, verified identity, and career history visible to the network.',
    pointingDirection: 'bottom',
    actionText: 'Next: Update Employment',
  },
  {
    id: 'profile-edit-btn',
    targetSelector: '[data-tour="profile-edit-btn"]',
    route: '/profile',
    badge: '🏢 Employment Status',
    title: 'Updating Your Employment Status',
    content:
      'Whenever you change positions or advance your career, click "Edit Profile". You can set whether you are Employed, Self-employed, or Seeking Opportunities, along with your company name, role, and industry.',
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
      'CTU-Naga is mandated by CHED, AACCUP, and PESO to verify graduate placement outcomes. In the Edit form, upload your Certificate of Employment (COE) or Company ID to validate official university leveling while keeping your data strictly confidential under RA 10173.',
    pointingDirection: 'top',
    actionText: 'Next: Privacy Controls',
  },
  {
    id: 'profile-privacy-tab',
    targetSelector: '[data-tour="profile-privacy-tab"]',
    route: '/profile',
    badge: '🔒 RA 10173 Compliant',
    title: 'Granular Privacy Safeguards',
    content:
      'You own your data! Under Republic Act 10173 (Data Privacy Act of 2012), toggle whether fellow alumni can view your email, contact number, or career history with simple switches.',
    pointingDirection: 'top',
    actionText: 'Finish Tutorial 🎉',
  },
  {
    id: 'tour-celebration',
    targetSelector: '',
    route: '/profile',
    badge: '🚀 All Done',
    title: "You're All Set, Naga Alumni!",
    content:
      'Congratulations! You now know how to navigate the portal, connect with fellow graduates, and keep your employment status certified. You can replay this interactive tutorial anytime from your account menu in the top-right.',
    pointingDirection: 'none',
    actionText: 'Explore Alumni Portal 🎓',
  },
];
