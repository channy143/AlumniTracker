import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { adminEligibleCreateSchema } from '../../middleware/validationSchemas';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string) || '';

    // Automatically check and link any unclaimed eligible records whose student_id is registered in profiles
    try {
      const { data: registeredProfiles } = await supabase
        .from('profiles')
        .select('user_id, id_number')
        .not('id_number', 'is', null);

      if (registeredProfiles && registeredProfiles.length > 0) {
        for (const p of registeredProfiles) {
          if (p.id_number && p.user_id) {
            await supabase
              .from('alumni_eligible')
              .update({ user_id: p.user_id })
              .eq('student_id', p.id_number)
              .is('user_id', null);
          }
        }
      }
    } catch (syncErr) {
      console.warn('Could not sync eligible claimed status:', syncErr);
    }

    // Only return eligible records that are truly unclaimed (user_id IS NULL)
    let query = supabase
      .from('alumni_eligible')
      .select('id, student_id, first_name, last_name, birth_date, program, year_graduated, user_id, created_at')
      .is('user_id', null);

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
