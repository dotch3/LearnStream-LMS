import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/* ── Shared layout wrapper ─────────────────────────────────── */
function emailLayout(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- preheader (hidden preview text) -->
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo / Brand header -->
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <span style="display:inline-block;background:#1e3a5f;color:#fff;font-size:18px;font-weight:700;letter-spacing:0.5px;padding:10px 24px;border-radius:10px;">
              LearnStream
            </span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
            This email was sent by LearnStream. If you didn't expect it, you can safely ignore it.<br/>
            &copy; ${new Date().getFullYear()} LearnStream. All rights reserved.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:13px 28px;background:#1e40af;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">${label}</a>`;
}

function credentialRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 16px 8px 0;color:#64748b;font-size:14px;white-space:nowrap;">${label}</td>
    <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  private get from(): string {
    return this.config.get<string>('SMTP_FROM', 'LearnStream <noreply@learnstream.app>');
  }

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
  }

  private async send(to: string, subject: string, html: string, context?: string): Promise<boolean> {
    const tag = context ? `[Email - ${context}]` : '[Email]';
    if (!this.config.get('SMTP_USER') || !this.config.get('SMTP_PASS')) {
      this.logger.warn(`${tag} "${subject}" → ${to} — SKIPPED (SMTP not configured)`);
      return false;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`${tag} "${subject}" → ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`${tag} "${subject}" → ${to} — FAILED: ${String(err)}`);
      return false;
    }
  }

  /* ── Welcome email ─────────────────────────────────────────── */
  async sendWelcome(email: string, name: string, password: string): Promise<boolean> {
    const loginUrl = `${this.frontendUrl}/login`;
    const html = emailLayout(
      'Welcome to LearnStream',
      `Your account is ready — log in with ${email}`,
      `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Welcome, ${name}! 👋</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Your LearnStream account has been created by your administrator.<br/>
        Use the credentials below to log in for the first time.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:4px 16px;width:100%;">
        ${credentialRow('Email', email)}
        ${credentialRow('Password', password)}
      </table>

      ${btn(loginUrl, 'Log in to LearnStream')}

      <p style="margin-top:28px;color:#94a3b8;font-size:13px;line-height:1.6;">
        For security, please change your password after your first login.<br/>
        You can do this from your profile page.
      </p>`,
    );
    return this.send(email, 'Welcome to LearnStream — Your account is ready', html, 'User Created');
  }

  /* ── Password reset email ──────────────────────────────────── */
  async sendPasswordReset(email: string, name: string, rawToken: string): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${rawToken}`;
    const html = emailLayout(
      'Reset your LearnStream password',
      'Reset link inside — expires in 1 hour',
      `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Password reset request</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
        Hi ${name}, we received a request to reset the password for your LearnStream account.
        Click the button below to set a new password.
      </p>

      ${btn(resetUrl, 'Reset my password')}

      <div style="margin-top:28px;padding:16px;background:#fef9ec;border:1px solid #fde68a;border-radius:8px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
          ⏱ This link expires in <strong>1 hour</strong>. After that, you'll need to request a new one.<br/>
          🔒 If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>

      <p style="margin-top:20px;color:#94a3b8;font-size:12px;word-break:break-all;">
        Or copy this link into your browser:<br/>
        <span style="color:#3b82f6;">${resetUrl}</span>
      </p>`,
    );
    return this.send(email, 'Reset your LearnStream password', html, 'Password Reset');
  }

  /* ── Invite email ─────────────────────────────────────────── */
  async sendInvite(email: string, inviteUrl: string, role: string): Promise<boolean> {
    const html = emailLayout(
      'You\'re invited to LearnStream',
      'Complete your account setup — link expires in 72 hours',
      `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">You've been invited! 🎉</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        An administrator has invited you to join LearnStream as a <strong style="color:#0f172a;">${role === 'ADMIN' ? 'Admin' : 'Viewer'}</strong>.<br/>
        Click the button below to set your name and password and activate your account.
      </p>

      ${btn(inviteUrl, 'Accept Invitation')}

      <div style="margin-top:28px;padding:16px;background:#fef9ec;border:1px solid #fde68a;border-radius:8px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
          ⏱ This invitation expires in <strong>72 hours</strong>.<br/>
          🔒 Only the email address that received this invite can be used to create the account.
        </p>
      </div>

      <p style="margin-top:20px;color:#94a3b8;font-size:12px;word-break:break-all;">
        Or copy this link:<br/>
        <span style="color:#3b82f6;">${inviteUrl}</span>
      </p>`,
    );
    return this.send(email, 'You\'re invited to join LearnStream', html, 'Invite');
  }

  /* ── Enrollment approved email ────────────────────────────── */
  async sendEnrollmentApproved(email: string, name: string, trackName: string): Promise<boolean> {
    const html = emailLayout(
      'Course Access Approved',
      `You now have access to ${trackName}`,
      `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">You're in! 🎉</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Hi ${name}, your request to join <strong style="color:#0f172a;">${trackName}</strong> has been <strong style="color:#16a34a;">approved</strong>.<br/>
        You can now access all course content.
      </p>
      ${btn(this.frontendUrl + '/dashboard/tracks', 'Go to My Courses')}`,
    );
    return this.send(email, `Access approved: ${trackName}`, html, 'Enrollment Approved');
  }

  /* ── Enrollment denied email ───────────────────────────────── */
  async sendEnrollmentDenied(email: string, name: string, trackName: string): Promise<boolean> {
    const html = emailLayout(
      'Course Access Not Approved',
      `Your request for ${trackName} was not approved`,
      `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Request not approved</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Hi ${name}, your request to join <strong style="color:#0f172a;">${trackName}</strong> was not approved at this time.<br/>
        Please contact your administrator if you believe this is an error.
      </p>`,
    );
    return this.send(email, `Access request update: ${trackName}`, html, 'Enrollment Denied');
  }

  /* ── Reply notification email ──────────────────────────────── */
  async sendReplyNotification(
    recipients: { email: string; name: string }[],
    commenterName: string,
    videoTitle: string,
    replyBody: string,
    videoUrl: string,
  ): Promise<void> {
    for (const r of recipients) {
      const html = emailLayout(
        `New reply on "${videoTitle}"`,
        `${commenterName} replied to a discussion you participated in`,
        `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
          Hi ${r.name},<br/><br/>
          <strong style="color:#0f172a;">${commenterName}</strong> replied to a discussion
          you participated in on <strong style="color:#0f172a;">${videoTitle}</strong>.
        </p>

        <div style="border-left:4px solid #1e40af;padding:12px 20px;background:#f0f5ff;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0;color:#1e3a5f;font-size:14px;line-height:1.6;">
            ${replyBody.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
          </p>
        </div>

        ${btn(videoUrl, 'View discussion')}`,
      );
      await this.send(
        r.email,
        `${commenterName} replied to a discussion on "${videoTitle}"`,
        html,
        'Reply Notification',
      );
    }
  }
}
