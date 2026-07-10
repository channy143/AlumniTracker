import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { addActivity, getRecentActivities } from '../services/activityStore';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await getRecentActivities(limit);
    res.json(activities);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { user, action, target } = req.body;
    if (!user || !action || !target) {
      return res.status(400).json({ error: 'user, action, and target are required' });
    }
    await addActivity(user, action, target);
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

export default router;
