import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { supabase } from './supabase';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function getAlumiLogoAttachment(): {
  filename: string;
  path: string;
  cid: string;
  contentType: string;
  contentDisposition: 'inline';
} | null {
  const candidates = [
    { rel: 'assets/alumi-animated.gif', filename: 'alumi-animated.gif', contentType: 'image/gif' },
    { rel: 'image/alumi-animated.gif', filename: 'alumi-animated.gif', contentType: 'image/gif' },
    { rel: 'client/public/image/alumi-animated.gif', filename: 'alumi-animated.gif', contentType: 'image/gif' },
    { rel: 'image/mascot.png', filename: 'mascot.png', contentType: 'image/png' },
    { rel: 'client/public/image/mascot.png', filename: 'mascot.png', contentType: 'image/png' },
    { rel: 'image/logo.png', filename: 'logo.png', contentType: 'image/png' },
    { rel: 'client/public/logo.png', filename: 'logo.png', contentType: 'image/png' },
  ];

  for (const c of candidates) {
    const possiblePaths = [
      path.resolve(process.cwd(), c.rel),
      path.resolve(process.cwd(), '..', c.rel),
      path.resolve(__dirname, '../..', c.rel),
      path.resolve(__dirname, '../../..', c.rel),
      path.resolve(__dirname, '../../../..', c.rel),
    ];
    const found = possiblePaths.find((p) => fs.existsSync(p));
    if (found) {
      return {
        filename: c.filename,
        path: found,
        cid: 'alumimascot',
        contentType: c.contentType,
        contentDisposition: 'inline',
      };
    }
  }
  return null;
}

function getAlumiFallbackUrl(): string {
  const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/$/, '');
  return clientUrl ? `${clientUrl}/image/alumi-animated.gif` : 'https://placehold.co/100x100?text=Alumi';
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }

  const logoAttachment = getAlumiLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : [];

  await transporter.sendMail({
    from: `"CTU-Naga Alumni Tracker" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your OTP Code — CTU-Naga Alumni Tracker',
    attachments,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px 20px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #003366 0%, #002244 100%); margin: -24px -20px 24px; padding: 24px 20px; border-radius: 14px 14px 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="width: 58px; vertical-align: middle; padding-right: 14px;">
                <img src="${logoAttachment ? 'cid:alumimascot' : getAlumiFallbackUrl()}" alt="Alumi — CTU-Naga Mascot" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #ffffff; padding: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);" />
              </td>
              <td style="vertical-align: middle;">
                <h1 style="color: #ffffff; font-size: 19px; margin: 0; font-weight: 700; line-height: 1.25; letter-spacing: -0.01em;">CTU-Naga Alumni Tracker</h1>
                <p style="color: #e8a050; margin: 4px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Bridging Education to Eternity</p>
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hello Alumnus,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Use the verification code below to confirm your account and authenticate securely into the CTU-Naga Alumni Tracker portal:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #ffffff; padding: 14px 32px; border-radius: 10px; border: 2px solid #e8a050; box-shadow: 0 4px 12px rgba(232, 160, 80, 0.15);">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #003366;">
              ${otp}
            </span>
          </div>
        </div>
        <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 12px 14px; margin: 0 0 20px;">
          <p style="color: #9a3412; font-size: 13px; line-height: 1.5; margin: 0;">
            ⏳ This one-time passcode is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">If you did not request this verification code, you can safely disregard this email or report suspicious activity to university administration.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 14px;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="vertical-align: middle;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
                Cebu Technological University &mdash; Naga Extension Campus<br />
                City of Naga, Cebu, Philippines
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}

export interface AlumniBroadcastEmailPayload {
  kind: 'announcement' | 'event';
  title: string;
  content: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
}

/**
 * Sends a Gmail notification (via BCC batches) to all registered alumni when
 * an admin publishes an announcement or creates an event.
 */
export async function notifyAllAlumniByEmail(
  payload: AlumniBroadcastEmailPayload,
  recipientEmailsOverride?: string[],
): Promise<void> {
  let rawEmails: string[] = [];
  if (Array.isArray(recipientEmailsOverride)) {
    rawEmails = recipientEmailsOverride;
  } else {
    const { data: alumniUsers, error } = await supabase
      .from('users')
      .select('email, is_archived, is_active')
      .eq('role', 'alumni');

    if (error) {
      console.error('[Email Broadcast] Failed to fetch alumni emails:', error.message);
      return;
    }

    rawEmails = (alumniUsers || [])
      .filter((u: any) => !u.is_archived && u.is_active !== false)
      .map((u: any) => String(u.email || '').trim());
  }

  const emails = Array.from(
    new Set(
      rawEmails
        .map((e: string) => String(e || '').trim())
        .filter((e: string) => e.includes('@'))
    )
  );

  if (emails.length === 0) return;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] Would email ${emails.length} alumni for ${payload.kind}: ${payload.title}`);
    return;
  }

  const isEvent = payload.kind === 'event';
  const badge = isEvent ? 'Upcoming Alumni Event' : 'Official Announcement';
  const subjectPrefix = isEvent ? 'New Event' : 'Announcement';
  const safeTitle = escapeHtml(payload.title);
  const safeContent = escapeHtml(payload.content || '').replace(/\n/g, '<br />');
  const safeDate = payload.date ? escapeHtml(payload.date) : '';
  const safeTime = payload.time ? escapeHtml(payload.time) : '';
  const safeLocation = payload.location ? escapeHtml(payload.location) : '';

  const eventDetailsHtml = isEvent && (safeDate || safeTime || safeLocation)
    ? `
      <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 12px 14px; margin: 0 0 18px; font-size: 13px; color: #7c2d12; line-height: 1.6;">
        ${safeDate ? `<div><strong>Date:</strong> ${safeDate}</div>` : ''}
        ${safeTime ? `<div><strong>Time:</strong> ${safeTime}</div>` : ''}
        ${safeLocation ? `<div><strong>Location:</strong> ${safeLocation}</div>` : ''}
      </div>
    `
    : '';

  const logoAttachment = getAlumiLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : [];

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 20px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #003366 0%, #002244 100%); margin: -24px -20px 24px; padding: 24px 20px; border-radius: 14px 14px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="width: 58px; vertical-align: middle; padding-right: 14px;">
              <img src="${logoAttachment ? 'cid:alumimascot' : getAlumiFallbackUrl()}" alt="Alumi — CTU-Naga Mascot" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #ffffff; padding: 3px;" />
            </td>
            <td style="vertical-align: middle;">
              <h1 style="color: #ffffff; font-size: 19px; margin: 0; font-weight: 700; line-height: 1.25;">CTU-Naga Alumni Tracker</h1>
              <p style="color: #e8a050; margin: 4px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">${badge}</p>
            </td>
          </tr>
        </table>
      </div>
      <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 12px; line-height: 1.35;">${safeTitle}</h2>
      ${eventDetailsHtml}
      <p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 20px;">${safeContent || 'Log in to the CTU-Naga Alumni Tracker portal to view full details.'}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 14px;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
        Cebu Technological University &mdash; Naga Extension Campus<br />
        City of Naga, Cebu, Philippines
      </p>
    </div>
  `;

  const BATCH_SIZE = 50;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const bccBatch = emails.slice(i, i + BATCH_SIZE);
    try {
      await transporter.sendMail({
        from: `"CTU-Naga Alumni Tracker" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        bcc: bccBatch,
        subject: `[CTU-Naga Alumni] ${subjectPrefix}: ${payload.title}`,
        attachments,
        html,
      });
    } catch (sendErr: any) {
      console.error(`[Email Broadcast] Batch ${i / BATCH_SIZE + 1} failed:`, sendErr?.message || sendErr);
    }
  }
}

export async function sendSurveyReminderEmail(
  emails: string[],
  payload: {
    surveyTitle: string;
    subject: string;
    message: string;
    isUrgent?: boolean;
    portalLink?: string;
  }
): Promise<void> {
  const validEmails = Array.from(
    new Set(
      (emails || [])
        .map((e) => String(e || '').trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    )
  );
  if (validEmails.length === 0) return;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] Would send survey reminder email to ${validEmails.length} alumni: ${payload.subject}`);
    return;
  }

  const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/$/, '');
  const ctaUrl = clientUrl ? `${clientUrl}${payload.portalLink || '/survey'}` : '';
  const safeTitle = escapeHtml(payload.surveyTitle);
  const safeSubject = escapeHtml(payload.subject);
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br />');
  const badge = payload.isUrgent ? 'Urgent Compliance Notice' : 'Tracer Survey Reminder';
  const badgeColor = payload.isUrgent ? '#fca5a5' : '#e8a050';
  const calloutBorder = payload.isUrgent ? '#dc2626' : '#f59e0b';
  const calloutBg = payload.isUrgent ? '#fef2f2' : '#fffbeb';

  const logoAttachment = getAlumiLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : [];

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 20px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #003366 0%, #002244 100%); margin: -24px -20px 24px; padding: 24px 20px; border-radius: 14px 14px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="width: 58px; vertical-align: middle; padding-right: 14px;">
              <img src="${logoAttachment ? 'cid:alumimascot' : getAlumiFallbackUrl()}" alt="Alumi — CTU-Naga Mascot" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #ffffff; padding: 3px;" />
            </td>
            <td style="vertical-align: middle;">
              <h1 style="color: #ffffff; font-size: 19px; margin: 0; font-weight: 700; line-height: 1.25;">CTU-Naga Alumni Tracker</h1>
              <p style="color: ${badgeColor}; margin: 4px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">${badge}</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="background: ${calloutBg}; border-left: 4px solid ${calloutBorder}; border-radius: 8px; padding: 14px 16px; margin: 0 0 18px;">
        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${safeTitle}</div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${safeSubject}</div>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 20px;">${safeMessage}</p>
      ${ctaUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px;">
            Complete Survey Now
          </a>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 14px;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
        Cebu Technological University &mdash; Naga Extension Campus<br />
        City of Naga, Cebu, Philippines
      </p>
    </div>
  `;

  const BATCH_SIZE = 50;
  for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
    const bccBatch = validEmails.slice(i, i + BATCH_SIZE);
    try {
      await transporter.sendMail({
        from: `"CTU-Naga Alumni Tracker" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        bcc: bccBatch,
        subject: `[CTU-Naga Alumni] ${payload.subject}`,
        attachments,
        html,
      });
    } catch (sendErr: any) {
      console.error(`[Survey Reminder Email] Batch ${i / BATCH_SIZE + 1} failed:`, sendErr?.message || sendErr);
    }
  }
}

export async function sendEmploymentVerificationEmail(
  to: string,
  payload: {
    alumniName: string;
    companyName?: string;
    position?: string;
    status: 'verified' | 'rejected';
    notes?: string;
  }
): Promise<void> {
  const cleanTo = String(to || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) return;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] Employment verification email to ${cleanTo}: ${payload.status}`);
    return;
  }

  const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/$/, '');
  const profileUrl = clientUrl ? `${clientUrl}/profile` : '';
  const isVerified = payload.status === 'verified';
  const jobInfo = [payload.position, payload.companyName].filter(Boolean).join(' at ');

  const subject = isVerified
    ? 'Certificate of Employment (COE) Verified — CTU-Naga Alumni Tracker'
    : 'Certificate of Employment (COE) Update Required — CTU-Naga Alumni Tracker';

  const badge = isVerified ? 'Document Verified' : 'Document Rejected / Action Required';
  const badgeColor = isVerified ? '#10b981' : '#ef4444';
  const calloutBorder = isVerified ? '#059669' : '#dc2626';
  const calloutBg = isVerified ? '#ecfdf5' : '#fef2f2';

  const logoAttachment = getAlumiLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : [];

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 20px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #003366 0%, #002244 100%); margin: -24px -20px 24px; padding: 24px 20px; border-radius: 14px 14px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="width: 58px; vertical-align: middle; padding-right: 14px;">
              <img src="${logoAttachment ? 'cid:alumimascot' : getAlumiFallbackUrl()}" alt="Alumi — CTU-Naga Mascot" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #ffffff; padding: 3px;" />
            </td>
            <td style="vertical-align: middle;">
              <h1 style="color: #ffffff; font-size: 19px; margin: 0; font-weight: 700; line-height: 1.25;">CTU-Naga Alumni Tracker</h1>
              <p style="color: ${badgeColor}; margin: 4px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">${badge}</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="background: ${calloutBg}; border-left: 4px solid ${calloutBorder}; border-radius: 8px; padding: 14px 16px; margin: 0 0 18px;">
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">
          ${isVerified ? 'Your Certificate of Employment has been approved' : 'Certificate of Employment was not approved'}
        </div>
        ${jobInfo ? `<div style="font-size: 13px; color: #475569; margin-top: 4px;">Role: <strong>${escapeHtml(jobInfo)}</strong></div>` : ''}
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">Hello ${escapeHtml(payload.alumniName || 'Alumnus')},</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">
        ${isVerified
          ? 'Your Certificate of Employment (COE) has been reviewed and successfully verified by the university administration for accreditation (Q-Pro).'
          : `Your Certificate of Employment (COE) could not be verified by the university administration.${payload.notes ? ` <strong>Reason:</strong> ${escapeHtml(payload.notes)}` : ''}`
        }
      </p>
      ${!isVerified ? `
        <p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 20px;">
          Please sign in to your account and upload a clear, legible copy of your Certificate of Employment (COE), Company ID, or appointment document under your Profile.
        </p>
      ` : ''}
      ${profileUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(profileUrl)}" style="display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px;">
            ${isVerified ? 'View Profile' : 'Update Employment Proof'}
          </a>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 14px;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
        Cebu Technological University &mdash; Naga Extension Campus<br />
        City of Naga, Cebu, Philippines
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"CTU-Naga Alumni Tracker" <${process.env.SMTP_USER}>`,
      to: cleanTo,
      subject,
      attachments,
      html,
    });
  } catch (err: any) {
    console.error(`[Email Verification] Failed to send email to ${cleanTo}:`, err?.message || err);
  }
}

export interface GovernanceDirectiveEmailPayload {
  toEmails: string[];
  recipientRoleLabel: string;
  senderName: string;
  senderRoleLabel: string;
  directiveType: 'access_delegation' | 'document_request' | 'general_directive';
  title: string;
  reason: string;
  documentType?: string;
  proposedPermissionsSummary?: string[];
}

export async function sendGovernanceDirectiveEmail(
  payload: GovernanceDirectiveEmailPayload
): Promise<{ sent: boolean; recipients: string[] }> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails = [...new Set((payload.toEmails || []).map((e) => String(e || '').trim().toLowerCase()).filter((e) => emailRegex.test(e)))];
  if (validEmails.length === 0) {
    return { sent: false, recipients: [] };
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] Governance directive email (${payload.directiveType}) to [${validEmails.join(', ')}]: ${payload.title} — ${payload.reason}`);
    return { sent: true, recipients: validEmails };
  }

  const logoAttachment = getAlumiLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : [];
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
  const portalUrl = `${clientUrl}/admin`;

  const isDelegation = payload.directiveType === 'access_delegation';
  const isDocRequest = payload.directiveType === 'document_request';

  const badgeText = isDelegation
    ? 'Role Access Delegation · Action Required'
    : isDocRequest
    ? 'Official Institutional Document Request'
    : 'Institutional Governance Directive';

  const subject = isDelegation
    ? `[CTU-Naga Governance] Role Access Adjustment Pending Your Acceptance — from ${payload.senderName}`
    : isDocRequest
    ? `[CTU-Naga Governance] Official Document Request: ${payload.documentType || payload.title}`
    : `[CTU-Naga Governance] ${payload.title} — from ${payload.senderName}`;

  const permsHtml =
    isDelegation && payload.proposedPermissionsSummary && payload.proposedPermissionsSummary.length > 0
      ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 0 0 18px;">
          <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Proposed Module Access Adjustments
          </div>
          <ul style="margin: 0; padding-left: 18px; color: #1e293b; font-size: 13px; line-height: 1.7;">
            ${payload.proposedPermissionsSummary.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `
      : '';

  const docHtml =
    isDocRequest && payload.documentType
      ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px; margin: 0 0 18px;">
          <div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">
            Requested File / Official Record
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #064e3b; margin-top: 3px;">
            📄 ${escapeHtml(payload.documentType)}
          </div>
        </div>
      `
      : '';

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 20px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); margin: -24px -20px 24px; padding: 24px 20px; border-radius: 14px 14px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="width: 58px; vertical-align: middle; padding-right: 14px;">
              <img src="${logoAttachment ? 'cid:alumimascot' : getAlumiFallbackUrl()}" alt="Alumi — CTU-Naga Mascot" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #ffffff; padding: 3px;" />
            </td>
            <td style="vertical-align: middle;">
              <h1 style="color: #ffffff; font-size: 19px; margin: 0; font-weight: 700; line-height: 1.25;">CTU-Naga Institutional Governance</h1>
              <p style="color: #fde68a; margin: 4px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${escapeHtml(badgeText)}</p>
            </td>
          </tr>
        </table>
      </div>

      <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
        Hello <strong>${escapeHtml(payload.recipientRoleLabel)}</strong>,
      </p>

      <p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">
        <strong>${escapeHtml(payload.senderName)}</strong> (${escapeHtml(payload.senderRoleLabel)}) has sent you an official governance ${
          isDelegation ? 'role access adjustment' : isDocRequest ? 'document/file request' : 'communication'
        } on the CTU-Naga Alumni Tracker portal:
      </p>

      <div style="background: #ffffff; border-left: 4px solid #f97316; border-radius: 8px; padding: 14px 16px; margin: 0 0 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
          ${escapeHtml(payload.title)}
        </div>
        <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line;">
          "${escapeHtml(payload.reason)}"
        </div>
      </div>

      ${docHtml}
      ${permsHtml}

      <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
        ${
          isDelegation
            ? 'Please log in to the CTU-Naga Alumni Tracker portal and open your Notification Bell (or Alumi Assistant popup) to <strong>review and accept these role access changes</strong> before they take effect.'
            : isDocRequest
            ? 'Please log in to the CTU-Naga Alumni Tracker portal to review this request, upload or prepare the requested file, and mark the request fulfilled.'
            : 'Please log in to the CTU-Naga Alumni Tracker portal to view and acknowledge this directive.'
        }
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${escapeHtml(portalUrl)}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 26px; border-radius: 10px;">
          ${isDelegation ? 'Log In & Accept Role Access Changes' : isDocRequest ? 'Log In & Respond to Document Request' : 'Open CTU-Naga Governance Portal'}
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 14px;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
        Cebu Technological University &mdash; Naga Extension Campus<br />
        City of Naga, Cebu, Philippines
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"CTU-Naga Governance" <${process.env.SMTP_USER}>`,
      to: validEmails.join(', '),
      subject,
      attachments,
      html,
    });
    return { sent: true, recipients: validEmails };
  } catch (err: any) {
    console.error('[Governance Email] Failed to send directive email:', err?.message || err);
    return { sent: false, recipients: validEmails };
  }
}
