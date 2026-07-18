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

import CareerTrendsPage from '@/pages/career-trends/CareerTrendsPage';
import CareerInsightsPage from '@/pages/career-trends/CareerInsightsPage';
import DirectoryPage from '@/pages/directory/DirectoryPage';
import DirectoryProfilePage from '@/pages/directory/DirectoryProfilePage';
import SupportPage from '@/pages/support/SupportPage';
import UsefulLinksPage from '@/pages/links/UsefulLinksPage';
import EventsPage from '@/pages/events/EventsPage';
import AnnouncementsPage from '@/pages/announcements/AnnouncementsPage';
import SurveyPage from '@/pages/survey/SurveyPage';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AlumniManagement from '@/pages/admin/AlumniManagement';
import JobManagement from '@/pages/admin/JobManagement';
import GraduateTracerSurveys from '@/pages/admin/GraduateTracerSurveys';
import AnnouncementManagement from '@/pages/admin/AnnouncementManagement';
import AdminEvents from '@/pages/admin/AdminEvents';
import CareerAnalytics from '@/pages/admin/CareerAnalytics';
import CurriculumInsights from '@/pages/admin/CurriculumInsights';
import EmployerInsights from '@/pages/admin/EmployerInsights';
import ReportsPage from '@/pages/admin/ReportsPage';
import SystemSettings from '@/pages/admin/SystemSettings';

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

        <Route path="career-trends" element={<CareerTrendsPage />} />
        <Route path="career-trends/:position" element={<CareerInsightsPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="directory/:id" element={<DirectoryProfilePage />} />
        <Route path="links" element={<UsefulLinksPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="surveys/:id" element={<SurveyPage />} />
        <Route path="support" element={<SupportPage />} />

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
        <Route path="/admin/jobs" element={<JobManagement />} />
        <Route path="/admin/surveys" element={<GraduateTracerSurveys />} />
        <Route path="/admin/announcements" element={<AnnouncementManagement />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/analytics" element={<CareerAnalytics />} />
        <Route path="/admin/curriculum" element={<CurriculumInsights />} />
        <Route path="/admin/employers" element={<EmployerInsights />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/settings" element={<SystemSettings />} />
      </Route>
    </Routes>
  );
}
