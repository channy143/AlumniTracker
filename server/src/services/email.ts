import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function getLogoPath(): string | null {
  const possiblePaths = [
    path.resolve(process.cwd(), 'image/logo.png'),
    path.resolve(process.cwd(), '../image/logo.png'),
    path.resolve(__dirname, '../../../image/logo.png'),
    path.resolve(__dirname, '../../../../image/logo.png'),
    path.resolve(process.cwd(), 'client/public/logo.png'),
    path.resolve(__dirname, '../../../client/public/logo.png'),
  ];
  return possiblePaths.find((p) => fs.existsSync(p)) || null;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }

  const logoPath = getLogoPath();
  const attachments = logoPath
    ? [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'ctulogo',
        },
      ]
    : [];

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
                <img src="${logoPath ? 'cid:ctulogo' : 'https://placehold.co/100x100?text=CTU'}" alt="CTU-Naga Logo" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #ffffff; padding: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);" />
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
