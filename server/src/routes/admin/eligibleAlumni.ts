import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { adminEligibleCreateSchema, adminEligibleBulkSchema } from '../../middleware/validationSchemas';
import { logAudit } from '../../services/auditLogger';
import { AuthenticatedRequest } from '../../types';

const router = Router();

function normalizeDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      const year = parts[2];
      const mOrD1 = parseInt(parts[0], 10);
      const mOrD2 = parseInt(parts[1], 10);
      if (mOrD1 <= 12) {
        return `${year}-${String(mOrD1).padStart(2, '0')}-${String(mOrD2).padStart(2, '0')}`;
      } else if (mOrD2 <= 12) {
        return `${year}-${String(mOrD2).padStart(2, '0')}-${String(mOrD1).padStart(2, '0')}`;
      }
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

// Downloadable standard CSV template
router.get('/template', (_req, res) => {
  const csvContent =
    'Student ID,Last Name,First Name,Middle Name,Program,Year Graduated,Graduation Date,Birth Date\r\n' +
    'CTU-2024-001,Dela Cruz,Juan,Santos,BSIT,2024,2024-06-15,2002-05-10\r\n' +
    'CTU-2024-002,Garcia,Maria,Reyes,BSEd-Math,2024,2024-06-15,2002-08-22\r\n' +
    ',Alcantara,Mark,Bautista,BTLED,2024,2024-06-15,\r\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ctu_naga_eligible_alumni_template.csv"');
  res.send(csvContent);
});

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
      .select('id, student_id, first_name, last_name, middle_name, birth_date, graduation_date, program, year_graduated, user_id, created_at')
      .is('user_id', null);

    if (search) {
      const s = search.toLowerCase();
      query = query.or(`student_id.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%,middle_name.ilike.%${s}%`);
    }
    const limit = parseInt(req.query.limit as string) || 10000;
    query = query.order('last_name', { ascending: true }).limit(limit);
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
    const { student_id, first_name, last_name, middle_name, birth_date, graduation_date, program, year_graduated } = req.body;
    const { data, error } = await supabase.from('alumni_eligible').insert({
      student_id: student_id ? student_id.trim() : null,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      middle_name: middle_name ? middle_name.trim() : null,
      birth_date: birth_date || null,
      graduation_date: graduation_date || null,
      program: program || null,
      year_graduated: year_graduated || null,
    }).select('id, student_id, first_name, last_name, middle_name, graduation_date').single();

    if (error) {
      if (error.code === '23505') throw new AppError('Student ID already exists in the registry', 409);
      throw new AppError(error.message, 500);
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', validate(adminEligibleBulkSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawRecords: any[] = req.body.records || [];
    if (!rawRecords.length) {
      throw new AppError('No records provided for bulk import', 400);
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Pre-fetch registered profiles to automatically link user_id if student_id matches
    const { data: registeredProfiles } = await supabase
      .from('profiles')
      .select('user_id, id_number')
      .not('id_number', 'is', null);

    const profileIdMap = new Map<string, string>();
    (registeredProfiles || []).forEach((p: any) => {
      if (p.id_number && p.user_id) {
        profileIdMap.set(String(p.id_number).trim().toLowerCase(), p.user_id);
      }
    });

    // Chunk records into batches of 100 for reliable database insertion
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rawRecords.length; i += CHUNK_SIZE) {
      const chunk = rawRecords.slice(i, i + CHUNK_SIZE);
      const rowsToInsert: any[] = [];

      for (const item of chunk) {
        const studentId = item.student_id ? String(item.student_id).trim() : null;
        const firstName = item.first_name ? String(item.first_name).trim() : '';
        const lastName = item.last_name ? String(item.last_name).trim() : '';
        const middleName = item.middle_name ? String(item.middle_name).trim() : null;

        if (!firstName || !lastName) {
          skipped++;
          errors.push(`Row skipped: missing first name or last name (${studentId || 'No ID'})`);
          continue;
        }

        const birthDate = normalizeDate(item.birth_date);
        const graduationDate = normalizeDate(item.graduation_date);
        const program = item.program ? String(item.program).trim() : null;
        const yearGraduated = item.year_graduated ? parseInt(String(item.year_graduated), 10) || null : null;

        const linkedUserId = studentId ? profileIdMap.get(studentId.toLowerCase()) || null : null;

        rowsToInsert.push({
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          birth_date: birthDate,
          graduation_date: graduationDate,
          program: program,
          year_graduated: yearGraduated,
          user_id: linkedUserId,
        });
      }

      if (rowsToInsert.length > 0) {
        const withStudentId = rowsToInsert.filter((r) => !!r.student_id);
        const withoutStudentId = rowsToInsert.filter((r) => !r.student_id);

        if (withStudentId.length > 0) {
          const { data: upsertedData, error: upsertErr } = await supabase
            .from('alumni_eligible')
            .upsert(withStudentId, {
              onConflict: 'student_id',
              ignoreDuplicates: false,
            })
            .select('id');

          if (upsertErr) {
            for (const r of withStudentId) {
              const { error: singleErr } = await supabase
                .from('alumni_eligible')
                .upsert([r], { onConflict: 'student_id' });
              if (singleErr) {
                skipped++;
                errors.push(`Error on student ID ${r.student_id}: ${singleErr.message}`);
              } else {
                inserted++;
              }
            }
          } else {
            inserted += (upsertedData || []).length;
          }
        }

        if (withoutStudentId.length > 0) {
          const { data: insertedData, error: insertErr } = await supabase
            .from('alumni_eligible')
            .insert(withoutStudentId)
            .select('id');

          if (insertErr) {
            skipped += withoutStudentId.length;
            errors.push(`Error inserting rows without student ID: ${insertErr.message}`);
          } else {
            inserted += (insertedData || []).length;
          }
        }
      }
    }

    logAudit(req, {
      action: 'ELIGIBLE_ALUMNI_BULK_IMPORTED',
      entity: 'alumni_eligible',
      severity: 'info',
      status: 'success',
      details: {
        totalReceived: rawRecords.length,
        insertedOrUpdated: inserted,
        skipped,
        errorCount: errors.length,
      },
    });

    res.status(200).json({
      success: true,
      total: rawRecords.length,
      inserted,
      updated: 0,
      skipped,
      errors: errors.slice(0, 20),
    });
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
