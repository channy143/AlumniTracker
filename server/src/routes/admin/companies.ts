import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { sanitizeFilterInput } from '../../utils/sanitizeFilterInput';
import { logAudit } from '../../services/auditLogger';
import { AuthenticatedRequest } from '../../types';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const industry = (req.query.industry as string) || '';
    const verified = req.query.verified as string;
    const partnershipStatus = (req.query.partnership_status as string) || '';
    const employerType = (req.query.employer_type as string) || '';
    const verificationStatus = (req.query.verification_status as string) || '';

    let query = supabase.from('companies').select('*', { count: 'exact' });

    if (search) {
      const cleanSearch = sanitizeFilterInput(search);
      query = query.or(`name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,city.ilike.%${cleanSearch}%,industry.ilike.%${cleanSearch}%,agreement_title.ilike.%${cleanSearch}%,agreement_number.ilike.%${cleanSearch}%`);
    }
    if (industry) query = query.eq('industry', industry);
    if (verified === 'true') query = query.eq('is_verified', true);
    else if (verified === 'false') query = query.eq('is_verified', false);
    if (partnershipStatus === 'partner' || partnershipStatus === 'non-partner') {
      query = query.eq('partnership_status', partnershipStatus);
    }
    if (employerType === 'partner' || employerType === 'regular') {
      query = query.eq('employer_type', employerType);
    }
    if (verificationStatus) {
      query = query.eq('agreement_verification_status', verificationStatus);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const [{ data: companies, count, error }, { data: allEmployments }, { data: allJobs }, { data: allCompaniesStats }] = await Promise.all([
      query,
      supabase.from('employment').select('company_name'),
      supabase.from('job_postings').select('company_id, company_name, is_active'),
      supabase.from('companies').select('id, name, partnership_status, employer_type, is_verified'),
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
    const partnersCount = (allCompaniesStats || []).filter((c: any) => c.partnership_status === 'partner' || c.employer_type === 'partner').length;
    const verifiedCount = (allCompaniesStats || []).filter((c: any) => c.is_verified === true).length;

    const partnerNames = new Set(
      (allCompaniesStats || [])
        .filter((c: any) => c.partnership_status === 'partner' || c.employer_type === 'partner')
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

router.post('/', async (req: AuthenticatedRequest, res, next) => {
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
      employer_type,
      partnership_status,
      agreement_type,
      agreement_title,
      agreement_number,
      agreement_file,
      agreement_start_date,
      agreement_end_date,
      agreement_status,
      verification_notes,
    } = req.body;
    if (!name || !name.trim()) throw new AppError('Company name is required', 400);

    const isPartner = employer_type === 'partner' || partnership_status === 'partner';
    const resolvedEmployerType = isPartner ? 'partner' : 'regular';
    const resolvedPartnershipStatus = isPartner ? 'partner' : 'non-partner';

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
      employer_type: resolvedEmployerType,
      partnership_status: resolvedPartnershipStatus,
      agreement_type: isPartner ? (agreement_type || null) : null,
      agreement_title: isPartner ? (agreement_title || null) : null,
      agreement_number: isPartner ? (agreement_number || null) : null,
      agreement_file: isPartner ? (agreement_file || null) : null,
      agreement_start_date: isPartner ? (agreement_start_date || null) : null,
      agreement_end_date: isPartner ? (agreement_end_date || null) : null,
      agreement_status: isPartner ? (agreement_status || 'active') : null,
      agreement_verification_status: isPartner ? 'pending' : 'none',
      verification_notes: verification_notes || null,
      is_verified: false,
      is_active: true,
    };

    const { data, error } = await supabase.from('companies').insert(insertPayload).select().single();

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) throw new AppError('Companies table not available. Run the SQL migration first.', 400);
    if (error) throw new AppError(error.message, 500);

    await logAudit(req, {
      action: 'CREATE_COMPANY',
      entity: 'company',
      entityId: data.id,
      details: {
        company_name: data.name,
        employer_type: data.employer_type,
        agreement_type: data.agreement_type,
      },
    });

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
      const original = (employments || []).find((e: any) => String(e.company_name || '').trim().toLowerCase() === lower)?.company_name?.trim() || lower;
      return {
        name: original,
        industry: industry || 'Other',
        employer_type: 'regular',
        partnership_status: 'non-partner',
        agreement_verification_status: 'none',
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

router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
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
      employer_type,
      partnership_status,
      agreement_type,
      agreement_title,
      agreement_number,
      agreement_file,
      agreement_start_date,
      agreement_end_date,
      agreement_status,
      agreement_verification_status,
      verification_notes,
      is_verified,
      is_active,
    } = req.body;

    const { data: existing } = await supabase.from('companies').select('*').eq('id', req.params.id).single();

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
    if (is_active !== undefined) updatePayload.is_active = is_active;

    if (employer_type !== undefined) {
      updatePayload.employer_type = employer_type;
      updatePayload.partnership_status = employer_type === 'partner' ? 'partner' : 'non-partner';
    } else if (partnership_status !== undefined) {
      updatePayload.partnership_status = partnership_status;
      updatePayload.employer_type = partnership_status === 'partner' ? 'partner' : 'regular';
    }

    if (agreement_type !== undefined) updatePayload.agreement_type = agreement_type;
    if (agreement_title !== undefined) updatePayload.agreement_title = agreement_title;
    if (agreement_number !== undefined) updatePayload.agreement_number = agreement_number;
    if (agreement_file !== undefined) updatePayload.agreement_file = agreement_file;
    if (agreement_start_date !== undefined) updatePayload.agreement_start_date = agreement_start_date;
    if (agreement_end_date !== undefined) updatePayload.agreement_end_date = agreement_end_date;
    if (agreement_status !== undefined) updatePayload.agreement_status = agreement_status;
    if (agreement_verification_status !== undefined) updatePayload.agreement_verification_status = agreement_verification_status;
    if (verification_notes !== undefined) updatePayload.verification_notes = verification_notes;

    if (is_verified !== undefined) {
      updatePayload.is_verified = Boolean(is_verified);
      if (is_verified) {
        updatePayload.verified_by = req.user?.userId;
        updatePayload.verified_at = new Date().toISOString();
      }
    }
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('companies').update(updatePayload).eq('id', req.params.id).select().single();
    if (error) throw new AppError(error.message, 500);

    // If agreement status was marked as expired, record audit log as specified
    if (existing && existing.agreement_status !== 'expired' && updatePayload.agreement_status === 'expired') {
      await logAudit(req, {
        action: 'PARTNERSHIP_EXPIRED',
        entity: 'company',
        entityId: data.id,
        details: {
          message: `${data.name}'s partnership expired.`,
          company_id: data.id,
          company_name: data.name,
          expiration_date: data.agreement_end_date,
        },
        severity: 'warning',
      });
    }

    res.json({ message: 'Company updated', data });
  } catch (err) {
    next(err);
  }
});

// Agreement Verification endpoint
router.post('/:id/verify-agreement', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { verification_status, notes } = req.body;
    if (!['pending', 'verified', 'rejected'].includes(verification_status)) {
      throw new AppError('verification_status must be "pending", "verified", or "rejected"', 400);
    }

    const { data: company, error: fetchErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !company) throw new AppError('Company not found', 404);

    const adminId = req.user?.userId || null;
    const now = new Date().toISOString();

    const updatePayload: any = {
      agreement_verification_status: verification_status,
      verification_notes: notes !== undefined ? notes : company.verification_notes,
      verified_by: adminId,
      verified_at: now,
      updated_at: now,
    };

    if (verification_status === 'verified') {
      updatePayload.is_verified = true;
      updatePayload.employer_type = 'partner';
      updatePayload.partnership_status = 'partner';
      if (!company.agreement_status || company.agreement_status === 'expired') {
        updatePayload.agreement_status = 'active';
      }
    } else if (verification_status === 'rejected') {
      updatePayload.is_verified = false;
    } else {
      updatePayload.is_verified = false;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) throw new AppError(updateErr.message, 500);

    // Audit Logging matching user's exact specification:
    // "Admin verified ABC Technologies' MOA."
    // "Admin rejected an uploaded partnership agreement."
    let auditMessage = '';
    const agreementTypeLabel = updated.agreement_type || 'MOA';
    if (verification_status === 'verified') {
      auditMessage = `Admin verified ${updated.name}'s ${agreementTypeLabel}.`;
    } else if (verification_status === 'rejected') {
      auditMessage = `Admin rejected an uploaded partnership agreement for ${updated.name}.`;
    } else {
      auditMessage = `Admin set ${updated.name}'s partnership agreement verification to pending.`;
    }

    await logAudit(req, {
      action: `PARTNERSHIP_${verification_status.toUpperCase()}`,
      entity: 'company',
      entityId: updated.id,
      details: {
        message: auditMessage,
        company_id: updated.id,
        company_name: updated.name,
        agreement_type: updated.agreement_type,
        verification_status,
        notes,
      },
      severity: verification_status === 'rejected' ? 'warning' : 'info',
    });

    res.json({
      message: auditMessage,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Upload agreement document (PDF)
router.post('/:id/upload-agreement', upload.single('agreement'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new AppError('No agreement file provided', 400);

    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new AppError('Only PDF files are supported for partnership agreements', 400);

    const dataUrl = `data:${file.mimetype || 'application/pdf'};base64,${file.buffer.toString('base64')}`;

    const { data: updated, error } = await supabase
      .from('companies')
      .update({
        agreement_file: dataUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json({
      message: `Agreement "${file.originalname}" uploaded successfully`,
      file_name: file.originalname,
      data: updated,
    });
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
    const employer_type = partnership_status === 'partner' ? 'partner' : 'regular';
    const { error } = await supabase.from('companies').update({
      partnership_status,
      employer_type,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: `Company partnership updated to ${partnership_status}`, partnership_status });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/verify', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: current } = await supabase.from('companies').select('is_verified, name, agreement_type').eq('id', req.params.id).single();
    const nextStatus = current ? !current.is_verified : true;

    const { error } = await supabase.from('companies').update({
      is_verified: nextStatus,
      agreement_verification_status: nextStatus ? 'verified' : 'pending',
      verified_by: nextStatus ? req.user?.userId : null,
      verified_at: nextStatus ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    if (nextStatus && current) {
      await logAudit(req, {
        action: 'PARTNERSHIP_VERIFIED',
        entity: 'company',
        entityId: req.params.id,
        details: {
          message: `Admin verified ${current.name}'s ${current.agreement_type || 'partnership agreement'}.`,
        },
      });
    }

    res.json({ message: nextStatus ? 'Company verified' : 'Company unverified', is_verified: nextStatus });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('companies').delete().eq('id', req.params.id);
    if (error) {
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

