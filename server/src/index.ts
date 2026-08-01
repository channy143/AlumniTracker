import 'dotenv/config';
import app from './app';
import { closeExpiredSurveys } from './routes/survey';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  closeExpiredSurveys().then(() => console.log('Checked for expired surveys')).catch(() => {});
});
