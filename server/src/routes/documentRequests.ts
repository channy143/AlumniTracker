import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { loadRoleOverrides } from '../services/roleOverrideService';
import { sendGovernanceDirectiveEmail } from '../services/email';
import { logAudit } from '../services/auditLogger';

const router = Router();

const SETTINGS_KEY = 'registrar_document_requests';

export interface DocumentRequestItem {
  id: string;
  reference_code: string;
  user_id: string;
  email: string;
  alumni_name: string;
  avatar_url: string | null;
  student_id: string | null;
  contact_number: string | null;
  program: string | null;
  year_graduated: number | null;
  documents: Array<{ type: string; copies: number }>;
  document_summary: string;
  purpose: string;
  preferred_pickup_date: string | null;
  notes: string | null;
  status: 'pending' | 'processing' | 'ready_for_pickup' | 'claimed' | 'rejected' | 'cancelled';
  pickup_schedule: string | null;
  pickup_window: string | null;
  registrar_remarks: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
  claimed_at: string | null;
}

async function loadDocumentRequests(): Promise<DocumentRequestItem[]> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    return Array.isArray(data?.value) ? data.value : [];
  } catch {
    return [];
  }
}

async function saveDocumentRequests(list: DocumentRequestItem[]): Promise<void> {
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update({ value: list })
      .eq('id', existing.id);
    if (error) throw new AppError(error.message, 500);
  } else {
    const { error } = await supabase
      .from('settings')
      .insert({ key: SETTINGS_KEY, value: list });
    if (error) throw new AppError(error.message, 500);
  }
}

router.use(authenticate);

// GET /api/document-requests/my — Logged-in alumnus fetches their own document requests + profile info
router.get('/my', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const [allRequests, profileRes] = await Promise.all([
      loadDocumentRequests(),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, id_number, phone, avatar_url')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    let education: any = null;
    if (profileRes.data?.id) {
      const { data: eduData } = await supabase
        .from('education')
        .select('course, year_graduated, degree_level')
        .eq('profile_id', profileRes.data.id)
        .order('year_graduated', { ascending: false })
        .limit(1)
        .maybeSingle();
      education = eduData || null;
    }

    const myRequests = allRequests
      .filter((r) => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      requests: myRequests,
      applicant: {
        email: req.user!.email,
        first_name: profileRes.data?.first_name || '',
        last_name: profileRes.data?.last_name || '',
        student_id: profileRes.data?.id_number || '',
        phone: profileRes.data?.phone || '',
        avatar_url: profileRes.data?.avatar_url || null,
        program: education?.course || '',
        year_graduated: education?.year_graduated || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/document-requests — Alumnus submits a new Registrar document request
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const {
      documents,
      purpose,
      preferred_pickup_date,
      contact_number,
      student_id,
      program,
      year_graduated,
      notes,
    } = req.body || {};

    if (!Array.isArray(documents) || documents.length === 0) {
      throw new AppError('Please select at least one official document to request', 400);
    }
    if (!purpose || !String(purpose).trim()) {
      throw new AppError('Please specify the purpose of your document request', 400);
    }

    const cleanDocs = documents
      .filter((d: any) => d && d.type && String(d.type).trim())
      .map((d: any) => ({
        type: String(d.type).trim(),
        copies: Math.max(1, Math.min(20, parseInt(String(d.copies || 1), 10) || 1)),
      }));

    if (cleanDocs.length === 0) {
      throw new AppError('Please select at least one valid document type', 400);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, id_number, phone, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    let edu: any = null;
    if (profile?.id) {
      const { data: eduData } = await supabase
        .from('education')
        .select('course, year_graduated')
        .eq('profile_id', profile.id)
        .order('year_graduated', { ascending: false })
        .limit(1)
        .maybeSingle();
      edu = eduData;
    }

    const alumniName =
      (profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '') ||
      req.user!.email;

    const year = new Date().getFullYear();
    const randCode = Math.floor(10000 + Math.random() * 90000);
    const referenceCode = `CTU-REG-${year}-${randCode}`;

    const docSummary = cleanDocs
      .map((d) => `${d.type} (${d.copies} ${d.copies === 1 ? 'copy' : 'copies'})`)
      .join(', ');

    const nowIso = new Date().toISOString();
    const newItem: DocumentRequestItem = {
      id: `docreq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reference_code: referenceCode,
      user_id: userId,
      email: req.user!.email,
      alumni_name: alumniName,
      avatar_url: profile?.avatar_url || null,
      student_id: (student_id && String(student_id).trim()) || profile?.id_number || null,
      contact_number: (contact_number && String(contact_number).trim()) || profile?.phone || null,
      program: (program && String(program).trim()) || edu?.course || null,
      year_graduated:
        (year_graduated ? parseInt(String(year_graduated), 10) : null) || edu?.year_graduated || null,
      documents: cleanDocs,
      document_summary: docSummary,
      purpose: String(purpose).trim(),
      preferred_pickup_date: preferred_pickup_date ? String(preferred_pickup_date).trim() : null,
      notes: notes ? String(notes).trim() : null,
      status: 'pending',
      pickup_schedule: preferred_pickup_date ? String(preferred_pickup_date).trim() : null,
      pickup_window: "Registrar's Office — Window 1 & 2 (Bring Valid ID & Claim Slip)",
      registrar_remarks: null,
      processed_by: null,
      created_at: nowIso,
      updated_at: nowIso,
      ready_at: null,
      claimed_at: null,
    };

    const existing = await loadDocumentRequests();
    const updated = [newItem, ...existing].slice(0, 500);
    await saveDocumentRequests(updated);

    // Notify all active Registrar and Alumni Chair users in-app
    try {
      const [usersRes, overrides] = await Promise.all([
        supabase.from('users').select('id, email, role, is_active'),
        loadRoleOverrides(),
      ]);
      const targets = (usersRes.data || []).filter((u: any) => {
        if (u.is_active === false) return false;
        const effRole = overrides[u.id] || u.role;
        return effRole === 'registrar' || effRole === 'admin';
      });

      if (targets.length > 0) {
        const notifRows = targets.map((u: any) => ({
          user_id: u.id,
          type: 'system',
          title: `📄 New Registrar Document Request [${referenceCode}]`,
          message: `${alumniName} requested: ${docSummary} (Purpose: ${newItem.purpose}).`,
          link: '/admin/document-requests',
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifRows);
      }
    } catch {
      // non-fatal notification error
    }

    logAudit(req, {
      action: 'ALUMNI_DOCUMENT_REQUEST_CREATED',
      entity: 'document_request',
      entityId: newItem.id,
      severity: 'info',
      status: 'success',
      details: {
        reference_code: referenceCode,
        document_summary: docSummary,
        purpose: newItem.purpose,
      },
    });

    res.status(201).json({ request: newItem });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/document-requests/:id/cancel — Alumnus cancels their own pending request
router.patch('/:id/cancel', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const list = await loadDocumentRequests();
    const idx = list.findIndex((r) => r.id === req.params.id && r.user_id === userId);
    if (idx === -1) {
      throw new AppError('Document request not found', 404);
    }
    if (list[idx].status !== 'pending') {
      throw new AppError('Only pending requests can be cancelled', 400);
    }

    list[idx].status = 'cancelled';
    list[idx].updated_at = new Date().toISOString();
    await saveDocumentRequests(list);

    res.json({ request: list[idx] });
  } catch (err) {
    next(err);
  }
});

// GET /api/document-requests/admin — Registrar & Admin list all alumni document requests
router.get('/admin', async (req: AuthenticatedRequest, res, next) => {
  try {
    const role = req.user!.role || '';
    if (!['admin', 'registrar', 'alumni_officer', 'staff'].includes(role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    const statusFilter = ((req.query.status as string) || '').trim();
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const docType = ((req.query.documentType as string) || '').trim().toLowerCase();

    const all = await loadDocumentRequests();

    const stats = {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      processing: all.filter((r) => r.status === 'processing').length,
      ready_for_pickup: all.filter((r) => r.status === 'ready_for_pickup').length,
      claimed: all.filter((r) => r.status === 'claimed').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
    };

    const filtered = all.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (docType && !r.document_summary.toLowerCase().includes(docType)) return false;
      if (search) {
        const hay = `${r.reference_code} ${r.alumni_name} ${r.email} ${r.student_id || ''} ${r.program || ''} ${r.document_summary} ${r.purpose}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json({
      requests: filtered,
      stats,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/document-requests/:id/status — Registrar / Admin updates status, schedule & remarks
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const role = req.user!.role || '';
    if (!['admin', 'registrar', 'alumni_officer', 'staff'].includes(role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    const { status, pickup_schedule, pickup_window, registrar_remarks } = req.body || {};
    if (!['pending', 'processing', 'ready_for_pickup', 'claimed', 'rejected'].includes(status)) {
      throw new AppError('Invalid document request status', 400);
    }

    const list = await loadDocumentRequests();
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      throw new AppError('Document request not found', 404);
    }

    const { data: staffProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    const processorName =
      (staffProfile ? `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim() : '') ||
      (role === 'registrar' ? "Registrar's Office" : 'Alumni Chair / Admin');

    const item = list[idx];
    const nowIso = new Date().toISOString();

    item.status = status;
    if (pickup_schedule !== undefined) item.pickup_schedule = pickup_schedule ? String(pickup_schedule).trim() : null;
    if (pickup_window !== undefined) item.pickup_window = pickup_window ? String(pickup_window).trim() : item.pickup_window;
    if (registrar_remarks !== undefined) item.registrar_remarks = registrar_remarks ? String(registrar_remarks).trim() : null;
    item.processed_by = processorName;
    item.updated_at = nowIso;
    if (status === 'ready_for_pickup') item.ready_at = nowIso;
    if (status === 'claimed') item.claimed_at = nowIso;

    list[idx] = item;
    await saveDocumentRequests(list);

    // Notify the alumnus in-app
    let notifTitle = '';
    let notifMsg = '';

    if (status === 'processing') {
      notifTitle = `⚙️ Registrar Processing Request [${item.reference_code}]`;
      notifMsg = `The Registrar's Office is now preparing your requested document (${item.document_summary}). Please wait for the "Ready for Pick-Up" notice before proceeding to the campus.`;
    } else if (status === 'ready_for_pickup') {
      notifTitle = `✅ Document Ready for Pick-Up at Registrar [${item.reference_code}]`;
      notifMsg = `Your requested document (${item.document_summary}) is READY! You may now proceed to ${
        item.pickup_window || "the Registrar's Office"
      }${item.pickup_schedule ? ` on ${item.pickup_schedule}` : ''}. Present Reference Code: ${item.reference_code}.${
        item.registrar_remarks ? ` Remarks: "${item.registrar_remarks}"` : ''
      }`;
    } else if (status === 'claimed') {
      notifTitle = `🎓 Document Released & Claimed [${item.reference_code}]`;
      notifMsg = `Your document request (${item.document_summary}) has been officially released at the Registrar's Office.`;
    } else if (status === 'rejected') {
      notifTitle = `⚠️ Action Required: Registrar Document Request [${item.reference_code}]`;
      notifMsg = `Your request for ${item.document_summary} requires attention before visiting: "${
        item.registrar_remarks || 'Please verify your clearance or student records.'
      }"`;
    }

    if (notifTitle) {
      try {
        await supabase.from('notifications').insert({
          user_id: item.user_id,
          type: 'system',
          title: notifTitle,
          message: notifMsg,
          link: '/document-requests',
          is_read: false,
        });
      } catch {
        // non-fatal
      }
    }

    // Send Gmail notification when ready_for_pickup or rejected
    if ((status === 'ready_for_pickup' || status === 'rejected') && item.email) {
      try {
        await sendGovernanceDirectiveEmail({
          toEmails: [item.email],
          recipientRoleLabel: item.alumni_name,
          senderName: processorName,
          senderRoleLabel: "CTU-Naga Registrar's Office",
          directiveType: 'document_request',
          title:
            status === 'ready_for_pickup'
              ? `Ready for Pick-Up at Registrar's Office [${item.reference_code}]`
              : `Update on Registrar Document Request [${item.reference_code}]`,
          reason: notifMsg,
          documentType: item.document_summary,
        });
      } catch {
        // non-fatal
      }
    }

    logAudit(req, {
      action: 'REGISTRAR_DOCUMENT_REQUEST_STATUS_UPDATED',
      entity: 'document_request',
      entityId: item.id,
      severity: 'info',
      status: 'success',
      details: {
        reference_code: item.reference_code,
        new_status: status,
        processed_by: processorName,
      },
    });

    res.json({ request: item });
  } catch (err) {
    next(err);
  }
});

export default router;
