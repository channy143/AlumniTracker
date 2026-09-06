import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { sanitizeFilterInput } from '../../utils/sanitizeFilterInput';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const industry = (req.query.industry as string) || '';
    const verified = req.query.verified as string;
    const partnershipStatus = (req.query.partnership_status as string) || '';

    let query = supabase.from('companies').select('*', { count: 'exact' });

    if (search) {
      const cleanSearch = sanitizeFilterInput(search);
      query = query.or(`name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,city.ilike.%${cleanSearch}%,industry.ilike.%${cleanSearch}%`);
    }
    if (industry) query = query.eq('industry', industry);
    if (verified === 'true') query = query.eq('is_verified', true);
    else if (verified === 'false') query = query.eq('is_verified', false);
    if (partnershipStatus === 'partner' || partnershipStatus === 'non-partner') {
      query = query.eq('partnership_status', partnershipStatus);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const [{ data: companies, count, error }, { data: allEmployments }, { data: allJobs }, { data: allCompaniesStats }] = await Promise.all([
      query,
      supabase.from('employment').select('company_name'),
      supabase.from('job_postings').select('company_id, company_name, is_active'),
      supabase.from('companies').select('id, name, partnership_status, is_verified'),
    ]);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return res.json({ data: [], total: 0, page, limit, stats: { total: 0, partners: 0, verified: 0, alumniAtPartners: 0 } });
    }
    if (error) throw new AppError(error.message, 500);

    // Build alumni count map by normalized company name
    const alumniCounts: Record<string, number> = {};
    (allEmployments || []).forEach((e: any) => {
      const cName = String(e.company_name || '').trim().toLowerCase();
      if (cName) {
        alumniCounts[cName] = (alumniCounts[cName] || 0) + 1;
      }
    });

    // Build jobs count map by company_id and company_name
    const jobCounts: Record<string, number> = {};
    (allJobs || []).forEach((j: any) => {
      if (j.is_active !== false) {
        if (j.company_id) {
          jobCounts[j.company_id] = (jobCounts[j.company_id] || 0) + 1;
        }
        const cName = String(j.company_name || '').trim().toLowerCase();
        if (cName) {
          jobCounts[cName] = (jobCounts[cName] || 0) + 1;
        }
      }
    });

    const enriched = (companies || []).map((c: any) => {
      const lowerName = String(c.name || '').trim().toLowerCase();
      const alumniCount = alumniCounts[lowerName] || 0;
      const jobsCount = jobCounts[c.id] || jobCounts[lowerName] || 0;
      return {
        ...c,
        alumniCount,
        jobsCount,
      };
    });

    const totalAll = allCompaniesStats?.length || 0;
    const partnersCount = (allCompaniesStats || []).filter((c: any) => c.partnership_status === 'partner').length;
    const verifiedCount = (allCompaniesStats || []).filter((c: any) => c.is_verified === true).length;

    const partnerNames = new Set(
      (allCompaniesStats || [])
        .filter((c: any) => c.partnership_status === 'partner')
        .map((c: any) => String(c.name || '').trim().toLowerCase())
    );
    let totalAlumniAtPartners = 0;
    (allEmployments || []).forEach((e: any) => {
      const cName = String(e.company_name || '').trim().toLowerCase();
      if (partnerNames.has(cName)) totalAlumniAtPartners++;
    });

    res.json({
      data: enriched,
      total: count || 0,
      page,
      limit,
      stats: {
        total: totalAll,
        partners: partnersCount,
        verified: verifiedCount,
        alumniAtPartners: totalAlumniAtPartners,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      industry,
      website,
      description,
      address,
      city,
      province,
      contact_email,
      contact_phone,
      partnership_status,
      is_verified,
    } = req.body;
    if (!name || !name.trim()) throw new AppError('Company name is required', 400);

    const insertPayload: any = {
      name: name.trim(),
      industry: industry || null,
      website: website || null,
      description: description || null,
      address: address || null,
      city: city || null,
      province: province || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      partnership_status: partnership_status || 'partner',
      is_verified: Boolean(is_verified),
      is_active: true,
    };

    if (insertPayload.is_verified) {
      insertPayload.verified_by = (req as any).user?.userId;
      insertPayload.verified_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from('companies').insert(insertPayload).select().single();

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) throw new AppError('Companies table not available. Run the SQL migration first.', 400);
    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/sync-employers', async (_req, res, next) => {
  try {
    const [{ data: employments }, { data: existingCompanies }] = await Promise.all([
      supabase.from('employment').select('company_name, company_industry'),
      supabase.from('companies').select('name'),
    ]);

    const existingNames = new Set((existingCompanies || []).map((c: any) => String(c.name || '').trim().toLowerCase()));
    const toInsertMap = new Map<string, string>();

    (employments || []).forEach((e: any) => {
      const rawName = String(e.company_name || '').trim();
      const lower = rawName.toLowerCase();
      if (rawName && !existingNames.has(lower) && !toInsertMap.has(lower)) {
        toInsertMap.set(lower, e.company_industry || 'Other');
      }
    });

    if (toInsertMap.size === 0) {
      return res.json({ message: 'All alumni employers are already registered in the directory.', added: 0 });
    }

    const newRows = [...toInsertMap.entries()].map(([lower, industry]) => {
      // Find original casing
      const original = (employments || []).find((e: any) => String(e.company_name || '').trim().toLowerCase() === lower)?.company_name?.trim() || lower;
      return {
        name: original,
        industry: industry || 'Other',
        partnership_status: 'non-partner',
        is_verified: false,
        is_active: true,
      };
    });

    const { error } = await supabase.from('companies').insert(newRows);
    if (error) throw new AppError(error.message, 500);

    res.json({ message: `Successfully synced ${newRows.length} company(ies) from alumni employment.`, added: newRows.length });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const {
      name,
      industry,
      website,
      description,
      address,
      city,
      province,
      contact_email,
      contact_phone,
      partnership_status,
      is_verified,
      is_active,
    } = req.body;

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (industry !== undefined) updatePayload.industry = industry;
    if (website !== undefined) updatePayload.website = website;
    if (description !== undefined) updatePayload.description = description;
    if (address !== undefined) updatePayload.address = address;
    if (city !== undefined) updatePayload.city = city;
    if (province !== undefined) updatePayload.province = province;
    if (contact_email !== undefined) updatePayload.contact_email = contact_email;
    if (contact_phone !== undefined) updatePayload.contact_phone = contact_phone;
    if (partnership_status !== undefined) updatePayload.partnership_status = partnership_status;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (is_verified !== undefined) {
      updatePayload.is_verified = Boolean(is_verified);
      if (is_verified) {
        updatePayload.verified_by = (req as any).user?.userId;
        updatePayload.verified_at = new Date().toISOString();
      }
    }
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('companies').update(updatePayload).eq('id', req.params.id).select().single();
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Company updated', data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/partnership', async (req, res, next) => {
  try {
    const { partnership_status } = req.body;
    if (!['partner', 'non-partner'].includes(partnership_status)) {
      throw new AppError('partnership_status must be "partner" or "non-partner"', 400);
    }
    const { error } = await supabase.from('companies').update({
      partnership_status,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: `Company partnership updated to ${partnership_status}`, partnership_status });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/verify', async (req, res, next) => {
  try {
    const { data: current } = await supabase.from('companies').select('is_verified').eq('id', req.params.id).single();
    const nextStatus = current ? !current.is_verified : true;

    const { error } = await supabase.from('companies').update({
      is_verified: nextStatus,
      verified_by: nextStatus ? (req as any).user?.userId : null,
      verified_at: nextStatus ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: nextStatus ? 'Company verified' : 'Company unverified', is_verified: nextStatus });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('companies').delete().eq('id', req.params.id);
    if (error) {
      // Fall back to soft delete if foreign key constraints exist
      const { error: softErr } = await supabase.from('companies').update({ is_active: false }).eq('id', req.params.id);
      if (softErr) throw new AppError(softErr.message, 500);
      return res.json({ message: 'Company deactivated' });
    }
    res.json({ message: 'Company deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

