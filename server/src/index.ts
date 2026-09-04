import 'dotenv/config';

// Validate JWT_SECRET before importing anything that uses it
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  process.exit(1);
}
if (jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long. Server cannot start.');
  process.exit(1);
}

import app from './app';
import { closeExpiredSurveys } from './routes/survey';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  closeExpiredSurveys().then(() => console.log('Checked for expired surveys')).catch(() => {});
});
