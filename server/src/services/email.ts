import nodemailer from 'nodemailer';

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: `"CTU-Naga Alumni Tracker" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your OTP Code — CTU-Naga Alumni Tracker',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
        <div style="background: #003366; margin: -32px -24px 32px; padding: 32px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 700;">CTU-Naga Alumni Tracker</h1>
          <p style="color: #e8a050; margin: 4px 0 0; font-size: 13px;">Bridging Education to Eternity</p>
        </div>
        <p style="color: #2d3748; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hello,</p>
        <p style="color: #2d3748; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Your one-time verification code for creating your alumni account is:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #003366; background: #ffffff; padding: 12px 28px; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${otp}
          </span>
        </div>
        <p style="color: #718096; font-size: 13px; line-height: 1.5; margin: 0 0 4px;">This code expires in <strong style="color: #e8a050;">10 minutes</strong>.</p>
        <p style="color: #718096; font-size: 13px; line-height: 1.5; margin: 0;">If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">Cebu Technological University — Naga Extension Campus</p>
      </div>
    `,
  });
}
