import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { adminEligibleCreateSchema } from '../../middleware/validationSchemas';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string) || '';
    let query = supabase.from('alumni_eligible').select('id, student_id, first_name, last_name, birth_date, program, year_graduated, user_id, created_at');
    if (search) {
      const s = search.toLowerCase();
      query = query.or(`student_id.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
    }
    query = query.order('created_at', { ascending: false }).limit(500);
    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.code === '42703') return res.json([]);
      throw new AppError(error.message, 500);
    }
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(adminEligibleCreateSchema), async (req, res, next) => {
  try {
    const { student_id, first_name, last_name, birth_date, program, year_graduated } = req.body;
    const { data, error } = await supabase.from('alumni_eligible').insert({
      student_id,
      first_name,
      last_name,
      birth_date,
      program: program || null,
      year_graduated: year_graduated || null,
    }).select('id, student_id, first_name, last_name').single();

    if (error) {
      if (error.code === '23505') throw new AppError('Student ID already exists in the registry', 409);
      throw new AppError(error.message, 500);
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('alumni_eligible').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Registry entry deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
