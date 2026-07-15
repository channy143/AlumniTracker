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
import reportsRouter from './reports';
import analyticsRouter from './analytics';
import usersRouter from './users';
import settingsRouter from './settings';
import auditLogsRouter from './audit-logs';

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return (arr || []).reduce((acc: Record<string, T[]>, item: T) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

const router = Router();

router.use(authenticate, authorize('admin'));

router.use('/dashboard', dashboardRouter);
router.use('/alumni', alumniRouter);
router.use('/companies', companiesRouter);
router.use('/jobs', jobsRouter);
router.use('/surveys', surveysRouter);
router.use('/announcements', announcementsRouter);
router.use('/reports', reportsRouter);
router.use('/analytics', analyticsRouter);
router.use('/users', usersRouter);
router.use('/settings', settingsRouter);
router.use('/audit-logs', auditLogsRouter);

router.get('/export', async (_req, res, next) => {
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

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
