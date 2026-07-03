import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/overview', authenticate, async (_req: AuthenticatedRequest, res, next) => {
  try {
    const { count: totalAlumni } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: employed } = await supabase
      .from('employment')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true);

    const { data: industries } = await supabase
      .from('employment')
      .select('company_industry');

    const industryCount: Record<string, number> = {};
    industries?.forEach((e) => {
      if (e.company_industry) {
        industryCount[e.company_industry] = (industryCount[e.company_industry] || 0) + 1;
      }
    });

    const topIndustries = Object.entries(industryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalAlumni,
      employedPercentage: totalAlumni ? Math.round((employed! / totalAlumni) * 100) : 0,
      topIndustries,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/batch/:year', authenticate, async (req, res, next) => {
  try {
    const { year } = req.params;

    const { data: graduates } = await supabase
      .from('education')
      .select('profile_id')
      .eq('year_graduated', parseInt(year));

    if (!graduates?.length) {
      return res.json({ batch: year, total: 0, employmentRate: 0, industries: [] });
    }

    const profileIds = graduates.map((g) => g.profile_id);

    const { data: employment } = await supabase
      .from('employment')
      .select('*')
      .in('profile_id', profileIds)
      .eq('is_current', true);

    const industryCount: Record<string, number> = {};
    employment?.forEach((e) => {
      if (e.company_industry) {
        industryCount[e.company_industry] = (industryCount[e.company_industry] || 0) + 1;
      }
    });

    res.json({
      batch: year,
      total: graduates.length,
      employmentRate: graduates.length
        ? Math.round((employment?.length || 0) / graduates.length * 100)
        : 0,
      industries: Object.entries(industryCount).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/industries', authenticate, async (_req, res, next) => {
  try {
    const { data: employment, error } = await supabase
      .from('employment')
      .select('company_industry, salary_range')
      .eq('is_current', true);

    if (error) throw new AppError(error.message, 500);

    const industryData: Record<string, { count: number; salaries: number[] }> = {};

    employment?.forEach((e) => {
      if (e.company_industry) {
        if (!industryData[e.company_industry]) {
          industryData[e.company_industry] = { count: 0, salaries: [] };
        }
        industryData[e.company_industry].count++;
      }
    });

    const industries = Object.entries(industryData).map(([name, data]) => ({
      name,
      count: data.count,
    }));

    res.json(industries);
  } catch (err) {
    next(err);
  }
});

export default router;
