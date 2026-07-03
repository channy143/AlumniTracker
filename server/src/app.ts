import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import employmentRoutes from './routes/employment';
import analyticsRoutes from './routes/analytics';
import mentorshipRoutes from './routes/mentorship';
import communityRoutes from './routes/community';
import jobsRoutes from './routes/jobs';
import surveyRoutes from './routes/survey';
import adminRoutes from './routes/admin';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employment', employmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
