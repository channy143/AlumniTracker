import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import dashboardRouter from './dashboard';
import alumniRouter from './alumni';
import companiesRouter from './companies';
import jobsRouter from './jobs';
import surveysRouter from './surveys';
import announcementsRouter from './announcements';
import eventsRouter from './events';
import reportsRouter from './reports';
import analyticsRouter from './analytics';
import employerInsightsRouter from './employer-insights';
import curriculumInsightsRouter from './curriculum-insights';
import usersRouter from './users';
import settingsRouter from './settings';
import auditLogsRouter from './audit-logs';
import eligibleAlumniRouter from './eligibleAlumni';
import securityIncidentsRouter from './security-incidents';
import { logAudit } from '../../services/auditLogger';
import { AuthenticatedRequest } from '../../types';
import { requireAdminSudo } from '../../middleware/sudo';
import { adminSensitiveLimiter } from '../../middleware/rateLimiter';

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return (arr || []).reduce((acc: Record<string, T[]>, item: T) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

const router = Router();

// Allow all institutional administrative roles into the admin router
router.use(authenticate, authorize('admin', 'alumni_officer', 'staff', 'registrar'));

// Shared institutional records (Admin, Alumni Officer, Staff, and Registrar)
router.use('/eligible-alumni', eligibleAlumniRouter);
router.use('/alumni', alumniRouter);
router.use('/reports', reportsRouter);

// Alumni Affairs Operations (Admin, Alumni Officer, Staff)
const authorizeOperations = authorize('admin', 'alumni_officer', 'staff');
router.use('/dashboard', authorizeOperations, dashboardRouter);
router.use('/companies', authorizeOperations, companiesRouter);
router.use('/jobs', authorizeOperations, jobsRouter);
router.use('/surveys', authorizeOperations, surveysRouter);
router.use('/announcements', authorizeOperations, announcementsRouter);
router.use('/events', authorizeOperations, eventsRouter);
router.use('/analytics', authorizeOperations, analyticsRouter);
router.use('/employer-insights', authorizeOperations, employerInsightsRouter);
router.use('/curriculum-insights', authorizeOperations, curriculumInsightsRouter);

// Sensitive System Management (Super Admin Only)
const authorizeSuperAdmin = authorize('admin');
router.use('/users', authorizeSuperAdmin, usersRouter);
router.use('/settings', authorizeSuperAdmin, settingsRouter);
router.use('/audit-logs', authorizeSuperAdmin, auditLogsRouter);
router.use('/security-incidents', authorizeSuperAdmin, securityIncidentsRouter);

router.get('/export', adminSensitiveLimiter, requireAdminSudo, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profilesData } = await supabase.from('profiles').select('*');
    const profileIds = (profilesData || []).map((p: any) => p.id).filter(Boolean);

    let education: any[] = [];
    let employment: any[] = [];
    if (profileIds.length > 0) {
      const ed = await supabase.from('education').select('*').in('profile_id', profileIds);
      education = ed.data || [];
      const emp = await supabase.from('employment').select('*').in('profile_id', profileIds);
      employment = emp.data || [];
    }

    const eduByProfile = groupBy(education, 'profile_id');
    const empByProfile = groupBy(employment, 'profile_id');

    const result = (profilesData || []).map((p: any) => ({
      ...p,
      education: eduByProfile[p.id] || [],
      employment: empByProfile[p.id] || [],
    }));

    if (req.user?.userId) {
      await supabase.from('report_exports').insert({
        user_id: req.user.userId,
        report_name: 'Full Alumni System Export',
        report_type: 'full_alumni_export',
        format: 'json',
        record_count: result.length,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] as string,
      });

      await logAudit(req, {
        actorId: req.user.userId,
        actorName: req.user.email,
        actorRole: 'admin',
        action: 'REPORT_EXPORTED',
        entity: 'reports',
        details: { reportName: 'Full Alumni System Export', recordCount: result.length },
        severity: 'info',
        status: 'success',
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
