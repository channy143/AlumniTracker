import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';

import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProfilePage from '@/pages/alumni/ProfilePage';

import MentorshipPage from '@/pages/mentorship/MentorshipPage';
import CareerTrendsPage from '@/pages/career-trends/CareerTrendsPage';
import CareerInsightsPage from '@/pages/career-trends/CareerInsightsPage';
import DirectoryPage from '@/pages/directory/DirectoryPage';
import DirectoryProfilePage from '@/pages/directory/DirectoryProfilePage';
import SupportPage from '@/pages/support/SupportPage';
import UsefulLinksPage from '@/pages/links/UsefulLinksPage';
import EventsPage from '@/pages/events/EventsPage';
import AnnouncementsPage from '@/pages/announcements/AnnouncementsPage';
import ConnectionsPage from '@/pages/connections/ConnectionsPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AlumniManagement from '@/pages/admin/AlumniManagement';
import EmployerManagement from '@/pages/admin/EmployerManagement';
import JobManagement from '@/pages/admin/JobManagement';
import SurveyManagement from '@/pages/admin/SurveyManagement';
import AnnouncementManagement from '@/pages/admin/AnnouncementManagement';
import ReportsPage from '@/pages/admin/ReportsPage';
import CareerAnalytics from '@/pages/admin/CareerAnalytics';
import UserManagement from '@/pages/admin/UserManagement';
import SystemSettings from '@/pages/admin/SystemSettings';
import AdminProfile from '@/pages/admin/AdminProfile';

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
  if (user.role !== 'admin') return <Navigate to="/" replace />;
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
  return <MainLayout />;
}

export default function App() {
  useAuth();
  return (
    <Routes>
      <Route path="/" element={<IndexRoute />}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="employment" element={<Navigate to="/career-trends" replace />} />
        <Route path="mentorship" element={<MentorshipPage />} />
        <Route path="career-trends" element={<CareerTrendsPage />} />
        <Route path="career-trends/:position" element={<CareerInsightsPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="directory/:id" element={<DirectoryProfilePage />} />
        <Route path="links" element={<UsefulLinksPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
      </Route>

      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        element={
          <AdminRoute>
            <MainLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/alumni" element={<AlumniManagement />} />
        <Route path="/admin/employers" element={<EmployerManagement />} />
        <Route path="/admin/jobs" element={<JobManagement />} />
        <Route path="/admin/surveys" element={<SurveyManagement />} />
        <Route path="/admin/announcements" element={<AnnouncementManagement />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/analytics" element={<CareerAnalytics />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/settings" element={<SystemSettings />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>
    </Routes>
  );
}
