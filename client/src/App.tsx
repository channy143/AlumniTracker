import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProfilePage from '@/pages/alumni/ProfilePage';
import EmploymentPage from '@/pages/employment/EmploymentPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import MentorshipPage from '@/pages/mentorship/MentorshipPage';
import CommunityPage from '@/pages/community/CommunityPage';
import JobsPage from '@/pages/jobs/JobsPage';
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
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  useAuth();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/employment" element={<EmploymentPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/mentorship" element={<MentorshipPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/jobs" element={<JobsPage />} />
      </Route>

      <Route
        element={
          <AdminRoute>
            <MainLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="alumni" element={<AlumniManagement />} />
          <Route path="employers" element={<EmployerManagement />} />
          <Route path="jobs" element={<JobManagement />} />
          <Route path="surveys" element={<SurveyManagement />} />
          <Route path="announcements" element={<AnnouncementManagement />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics" element={<CareerAnalytics />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Route>
    </Routes>
  );
}
