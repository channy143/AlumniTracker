import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, writeLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import employmentRoutes from './routes/employment';
import analyticsRoutes from './routes/analytics';
import mentorshipRoutes from './routes/mentorship';
import communityRoutes from './routes/community';
import jobsRoutes from './routes/jobs';
import surveyRoutes from './routes/survey';
import adminRoutes from './routes/admin';
import connectionsRoutes from './routes/connections';
import messagesRoutes from './routes/messages';
import referralsRoutes from './routes/referrals';
import networkingRoutes from './routes/networking';
import feedRoutes from './routes/feed';
import activitiesRoutes from './routes/activities';
import notificationsRoutes from './routes/notifications';
import eventsRoutes from './routes/events';
import announcementsRoutes from './routes/announcements';
import careerTrendsRoutes from './routes/careerTrends';
import directoryRoutes from './routes/directory';
import publicRoutes from './routes/public';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employment', employmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mentorship', writeLimiter, mentorshipRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/connections', writeLimiter, connectionsRoutes);
app.use('/api/messages', writeLimiter, messagesRoutes);
app.use('/api/referrals', writeLimiter, referralsRoutes);
app.use('/api/networking', networkingRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/career-trends', careerTrendsRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
