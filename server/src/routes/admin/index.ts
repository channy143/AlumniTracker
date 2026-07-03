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
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*, education(*), employment(*)');
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

export default router;
