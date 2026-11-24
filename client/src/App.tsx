import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useAdminIdleTimeout } from '@/hooks/useAdminIdleTimeout';
import { useRolePermissions } from '@/utils/rolePermissions';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import ScrollToTop from '@/components/layout/ScrollToTop';
import AccountDeletedModal from '@/components/security/AccountDeletedModal';
import AdminSudoModal from '@/components/security/AdminSudoModal';
import AdminIdleTimeoutModal from '@/components/security/AdminIdleTimeoutModal';

import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProfilePage from '@/pages/alumni/ProfilePage';

import CareerTrendsPage from '@/pages/career-trends/CareerTrendsPage';
import CareerInsightsPage from '@/pages/career-trends/CareerInsightsPage';
import DirectoryPage from '@/pages/directory/DirectoryPage';
import DirectoryProfilePage from '@/pages/directory/DirectoryProfilePage';
import SupportPage from '@/pages/support/SupportPage';
import UsefulLinksPage from '@/pages/links/UsefulLinksPage';
import EventsPage from '@/pages/events/EventsPage';
import AnnouncementsPage from '@/pages/announcements/AnnouncementsPage';
import JobsPage from '@/pages/jobs/JobsPage';
import SurveyPage from '@/pages/survey/SurveyPage';
import TracerSurveyPage from '@/pages/survey/TracerSurveyPage';
import AlumniOnboardingSurveyPage from '@/pages/survey/AlumniOnboardingSurveyPage';
import EmployerDashboard from '@/pages/employer/EmployerDashboard';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import ConnectionsPage from '@/pages/connections/ConnectionsPage';
import CommunityPage from '@/pages/community/CommunityPage';
import AlumniDocumentRequestsPage from '@/pages/documents/AlumniDocumentRequestsPage';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AlumniManagement from '@/pages/admin/AlumniManagement';
import AdminDocumentRequests from '@/pages/admin/AdminDocumentRequests';
import OjtManagement from '@/pages/admin/OjtManagement';
import CompanyManagement from '@/pages/admin/CompanyManagement';
import JobManagement from '@/pages/admin/JobManagement';
import GraduateTracerSurveys from '@/pages/admin/GraduateTracerSurveys';
import AnnouncementManagement from '@/pages/admin/AnnouncementManagement';
import AdminEvents from '@/pages/admin/AdminEvents';
import CareerAnalytics from '@/pages/admin/CareerAnalytics';
import CurriculumInsights from '@/pages/admin/CurriculumInsights';
import EmployerInsights from '@/pages/admin/EmployerInsights';
import EmployerDetail from '@/pages/admin/EmployerDetail';
import ReportsPage from '@/pages/admin/ReportsPage';
import SystemSettings from '@/pages/admin/SystemSettings';
import AdminActivity from '@/pages/admin/AdminActivity';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ctu-blue" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (
    ['staff', 'alumni_officer', 'registrar'].includes(user.role) &&
    sessionStorage.getItem('ctu_active_portal_mode') === 'admin'
  ) {
    return <Navigate to={user.role === 'registrar' ? '/admin/alumni?tab=eligible' : '/admin'} replace />;
  }
  if (user.role === 'alumni' && user.survey_completed === false) {
    return <Navigate to="/survey/onboarding" replace />;
  }
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ctu-blue" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.survey_completed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ctu-blue" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!['admin', 'staff', 'alumni_officer', 'registrar'].includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ModuleAccessRoute({ href, children }: { href: string; children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { getNavAccess, loadingPermissions } = useRolePermissions();
  if (user?.role === 'admin') return <>{children}</>;
  if (loadingPermissions) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }
  const access = getNavAccess(href);
  if (access.locked) {
    const fallback = user?.role === 'registrar' ? '/admin/alumni?tab=eligible' : '/admin';
    if (fallback === href) return <Navigate to="/admin/alumni" replace />;
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

function IndexRoute() {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ctu-blue" />
      </div>
    );
  }
  if (!user) return <LandingPage />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (
    ['staff', 'alumni_officer', 'registrar'].includes(user.role) &&
    sessionStorage.getItem('ctu_active_portal_mode') === 'admin'
  ) {
    return <Navigate to={user.role === 'registrar' ? '/admin/alumni?tab=eligible' : '/admin'} replace />;
  }
  if (user.role === 'alumni' && user.survey_completed === false) {
    return <Navigate to="/survey/onboarding" replace />;
  }
  return <MainLayout />;
}

export default function App() {
  useAuth();
  useHeartbeat();
  const idleTimeout = useAdminIdleTimeout();
  return (
    <>
      <ScrollToTop />
      <AccountDeletedModal />
      <AdminSudoModal />
      <AdminIdleTimeoutModal
        open={idleTimeout.showWarning}
        secondsLeft={idleTimeout.secondsLeft}
        onStaySignedIn={idleTimeout.staySignedIn}
        onLogoutNow={idleTimeout.logoutNow}
      />
      <Routes>
      <Route path="/" element={<IndexRoute />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="employment" element={<Navigate to="/career-trends" replace />} />

        <Route path="career-trends" element={<CareerTrendsPage />} />
        <Route path="career-trends/:position" element={<CareerInsightsPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="directory/:id" element={<DirectoryProfilePage />} />
        <Route path="links" element={<UsefulLinksPage />} />
        <Route path="cefi-links" element={<Navigate to="/links" replace />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="employer/dashboard" element={<EmployerDashboard />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="tracer-survey" element={<TracerSurveyPage />} />
        <Route path="surveys" element={<Navigate to="/tracer-survey" replace />} />
        <Route path="surveys/:id" element={<SurveyPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="help" element={<Navigate to="/support" replace />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="network" element={<Navigate to="/connections" replace />} />
        <Route path="mentorship" element={<Navigate to="/connections" replace />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="forum" element={<Navigate to="/community" replace />} />
        <Route path="document-requests" element={<AlumniDocumentRequestsPage />} />

      </Route>

      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/survey/onboarding"
        element={
          <OnboardingRoute>
            <AlumniOnboardingSurveyPage />
          </OnboardingRoute>
        }
      />

      <Route
        element={
          <AdminRoute>
            <MainLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<ModuleAccessRoute href="/admin"><AdminDashboard /></ModuleAccessRoute>} />
        <Route path="/admin/alumni" element={<ModuleAccessRoute href="/admin/alumni"><AlumniManagement /></ModuleAccessRoute>} />
        <Route path="/admin/document-requests" element={<ModuleAccessRoute href="/admin/document-requests"><AdminDocumentRequests /></ModuleAccessRoute>} />
        <Route path="/admin/ojt" element={<ModuleAccessRoute href="/admin/ojt"><OjtManagement /></ModuleAccessRoute>} />
        <Route path="/admin/companies" element={<ModuleAccessRoute href="/admin/companies"><CompanyManagement /></ModuleAccessRoute>} />
        <Route path="/admin/jobs" element={<ModuleAccessRoute href="/admin/jobs"><JobManagement /></ModuleAccessRoute>} />
        <Route path="/admin/surveys" element={<ModuleAccessRoute href="/admin/surveys"><GraduateTracerSurveys /></ModuleAccessRoute>} />
        <Route path="/admin/announcements" element={<ModuleAccessRoute href="/admin/announcements"><AnnouncementManagement /></ModuleAccessRoute>} />
        <Route path="/admin/events" element={<ModuleAccessRoute href="/admin/events"><AdminEvents /></ModuleAccessRoute>} />
        <Route path="/admin/analytics" element={<ModuleAccessRoute href="/admin/analytics"><CareerAnalytics /></ModuleAccessRoute>} />
        <Route path="/admin/accreditation" element={<Navigate to="/admin/analytics?tab=qpro" replace />} />
        <Route path="/admin/curriculum" element={<ModuleAccessRoute href="/admin/curriculum"><CurriculumInsights /></ModuleAccessRoute>} />
        <Route path="/admin/employers" element={<ModuleAccessRoute href="/admin/employers"><EmployerInsights /></ModuleAccessRoute>} />
        <Route path="/admin/employers/:name" element={<ModuleAccessRoute href="/admin/employers"><EmployerDetail /></ModuleAccessRoute>} />
        <Route path="/admin/employer-dashboard" element={<ModuleAccessRoute href="/admin/employers"><EmployerDashboard /></ModuleAccessRoute>} />
        <Route path="/admin/reports" element={<ModuleAccessRoute href="/admin/reports"><ReportsPage /></ModuleAccessRoute>} />
        <Route path="/admin/settings" element={<ModuleAccessRoute href="/admin/settings"><SystemSettings /></ModuleAccessRoute>} />
        <Route path="/admin/activity" element={<ModuleAccessRoute href="/admin/activity"><AdminActivity /></ModuleAccessRoute>} />
        <Route path="/admin/notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
    </>
  );
}
