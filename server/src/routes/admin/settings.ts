import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { requireAdminSudo } from '../../middleware/sudo';
import { adminSensitiveLimiter } from '../../middleware/rateLimiter';
import { clearAdminSecurityPolicyCache } from '../../services/sessionSecurityService';
import { logAudit } from '../../services/auditLogger';

const router = Router();

const DEFAULT_SETTINGS = {
  university_name: 'CTU-Naga Extension Campus',
  tagline: 'Bridging Education to Eternity',
  logo_url: '',
  primary_color: '#003366',
  secondary_color: '#D4AF37',
  academic_year_start: 2014,
  courses: ['BEEd', 'BSEd-Math', 'BTLED', 'BIT', 'BSIT'],
  colleges: ['College of Education', 'College of Technology'],
  employment_types: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
  industries: ['Technology', 'Education', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Construction', 'Government'],
  require_admin_mfa: true,
  admin_idle_timeout_minutes: 15,
  require_sudo_for_sensitive: true,
};

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_settings')
      .maybeSingle();

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json(DEFAULT_SETTINGS);
    if (error) throw new AppError(error.message, 500);
    res.json(data?.value || DEFAULT_SETTINGS);
  } catch (err) {
    next(err);
  }
});

router.put('/', adminSensitiveLimiter, requireAdminSudo, async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'system_settings')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update({ value: req.body })
        .eq('id', existing.id);
      if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ message: 'Settings table not available' });
      if (error) throw new AppError(error.message, 500);
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({ key: 'system_settings', value: req.body });
      if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ message: 'Settings table not available' });
      if (error) throw new AppError(error.message, 500);
    }

    clearAdminSecurityPolicyCache();
    logAudit(req, {
      action: 'ADMIN_SETTINGS_UPDATED',
      entity: 'settings',
      severity: 'warning',
      status: 'success',
      details: {
        require_admin_mfa: req.body?.require_admin_mfa,
        admin_idle_timeout_minutes: req.body?.admin_idle_timeout_minutes,
        require_sudo_for_sensitive: req.body?.require_sudo_for_sensitive,
      },
    });

    res.json({ message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
});

export default router;

