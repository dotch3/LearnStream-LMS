import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/* ── Shared layout wrapper ─────────────────────────────────── */
function emailLayout(title: string, preheader: string, body: string, locale = 'en'): string {
  const footer = locale === 'pt'
    ? `Este e-mail foi enviado pelo LearnStream. Se você não esperava recebê-lo, pode ignorá-lo com segurança.<br/>&copy; ${new Date().getFullYear()} LearnStream. Todos os direitos reservados.`
    : `This email was sent by LearnStream. If you didn't expect it, you can safely ignore it.<br/>&copy; ${new Date().getFullYear()} LearnStream. All rights reserved.`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <span style="display:inline-block;background:#1e3a5f;color:#fff;font-size:18px;font-weight:700;letter-spacing:0.5px;padding:10px 24px;border-radius:10px;">
              LearnStream
            </span>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            ${body}
          </td>
        </tr>

        <tr>
          <td style="padding-top:24px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
            ${footer}
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
  async sendWelcome(email: string, name: string, password: string, locale = 'en'): Promise<boolean> {
    const loginUrl = `${this.frontendUrl}/login`;
    const isPt = locale === 'pt';
    const html = emailLayout(
      isPt ? 'Bem-vindo ao LearnStream' : 'Welcome to LearnStream',
      isPt ? `Sua conta está pronta — acesse com ${email}` : `Your account is ready — log in with ${email}`,
      isPt
        ? `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Bem-vindo(a), ${name}! 👋</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Sua conta no LearnStream foi criada pelo administrador.<br/>
            Use as credenciais abaixo para fazer seu primeiro acesso.
          </p>
          <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:4px 16px;width:100%;">
            ${credentialRow('E-mail', email)}
            ${credentialRow('Senha', password)}
          </table>
          ${btn(loginUrl, 'Acessar o LearnStream')}
          <p style="margin-top:28px;color:#94a3b8;font-size:13px;line-height:1.6;">
            Por segurança, altere sua senha após o primeiro acesso.<br/>
            Você pode fazer isso na página de perfil.
          </p>`
        : `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Welcome, ${name}! 👋</h2>
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
      locale,
    );
    const subject = isPt ? 'Bem-vindo ao LearnStream — Sua conta está pronta' : 'Welcome to LearnStream — Your account is ready';
    return this.send(email, subject, html, 'User Created');
  }

  /* ── Password reset email ──────────────────────────────────── */
  async sendPasswordReset(email: string, name: string, rawToken: string, locale = 'en'): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${rawToken}`;
    const isPt = locale === 'pt';
    const html = emailLayout(
      isPt ? 'Redefinir sua senha do LearnStream' : 'Reset your LearnStream password',
      isPt ? 'Link de redefinição dentro — expira em 1 hora' : 'Reset link inside — expires in 1 hour',
      isPt
        ? `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Solicitação de redefinição de senha</h2>
          <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
            Olá ${name}, recebemos uma solicitação para redefinir a senha da sua conta no LearnStream.
            Clique no botão abaixo para criar uma nova senha.
          </p>
          ${btn(resetUrl, 'Redefinir minha senha')}
          <div style="margin-top:28px;padding:16px;background:#fef9ec;border:1px solid #fde68a;border-radius:8px;">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
              ⏱ Este link expira em <strong>1 hora</strong>. Após isso, você precisará solicitar um novo.<br/>
              🔒 Se você não fez essa solicitação, pode ignorar este e-mail — sua senha não será alterada.
            </p>
          </div>
          <p style="margin-top:20px;color:#94a3b8;font-size:12px;word-break:break-all;">
            Ou copie este link no seu navegador:<br/>
            <span style="color:#3b82f6;">${resetUrl}</span>
          </p>`
        : `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Password reset request</h2>
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
      locale,
    );
    const subject = isPt ? 'Redefina sua senha do LearnStream' : 'Reset your LearnStream password';
    return this.send(email, subject, html, 'Password Reset');
  }

  /* ── Invite email ─────────────────────────────────────────── */
  async sendInvite(email: string, inviteUrl: string, role: string, locale = 'en'): Promise<boolean> {
    const isPt = locale === 'pt';
    const roleLabel = role === 'ADMIN' ? (isPt ? 'Administrador' : 'Admin') : (isPt ? 'Visualizador' : 'Viewer');
    const html = emailLayout(
      isPt ? 'Você foi convidado para o LearnStream' : "You're invited to LearnStream",
      isPt ? 'Complete seu cadastro — link expira em 72 horas' : 'Complete your account setup — link expires in 72 hours',
      isPt
        ? `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Você recebeu um convite! 🎉</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Um administrador convidou você para o LearnStream como <strong style="color:#0f172a;">${roleLabel}</strong>.<br/>
            Clique no botão abaixo para definir seu nome e senha e ativar sua conta.
          </p>
          ${btn(inviteUrl, 'Aceitar convite')}
          <div style="margin-top:28px;padding:16px;background:#fef9ec;border:1px solid #fde68a;border-radius:8px;">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
              ⏱ Este convite expira em <strong>72 horas</strong>.<br/>
              🔒 Apenas o endereço de e-mail que recebeu este convite pode ser usado para criar a conta.
            </p>
          </div>
          <p style="margin-top:20px;color:#94a3b8;font-size:12px;word-break:break-all;">
            Ou copie este link:<br/>
            <span style="color:#3b82f6;">${inviteUrl}</span>
          </p>`
        : `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">You've been invited! 🎉</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            An administrator has invited you to join LearnStream as a <strong style="color:#0f172a;">${roleLabel}</strong>.<br/>
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
      locale,
    );
    const subject = isPt ? 'Você foi convidado para o LearnStream' : "You're invited to join LearnStream";
    return this.send(email, subject, html, 'Invite');
  }

  /* ── Enrollment approved email ────────────────────────────── */
  async sendEnrollmentApproved(email: string, name: string, trackName: string, locale = 'en'): Promise<boolean> {
    const isPt = locale === 'pt';
    const html = emailLayout(
      isPt ? 'Acesso ao curso aprovado' : 'Course Access Approved',
      isPt ? `Você agora tem acesso a ${trackName}` : `You now have access to ${trackName}`,
      isPt
        ? `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Você está dentro! 🎉</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Olá ${name}, sua solicitação para participar de <strong style="color:#0f172a;">${trackName}</strong> foi <strong style="color:#16a34a;">aprovada</strong>.<br/>
            Você já pode acessar todo o conteúdo do curso.
          </p>
          ${btn(this.frontendUrl + '/dashboard/tracks', 'Ir para Meus Cursos')}`
        : `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">You're in! 🎉</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Hi ${name}, your request to join <strong style="color:#0f172a;">${trackName}</strong> has been <strong style="color:#16a34a;">approved</strong>.<br/>
            You can now access all course content.
          </p>
          ${btn(this.frontendUrl + '/dashboard/tracks', 'Go to My Courses')}`,
      locale,
    );
    const subject = isPt ? `Acesso aprovado: ${trackName}` : `Access approved: ${trackName}`;
    return this.send(email, subject, html, 'Enrollment Approved');
  }

  /* ── Enrollment denied email ───────────────────────────────── */
  async sendEnrollmentDenied(email: string, name: string, trackName: string, locale = 'en'): Promise<boolean> {
    const isPt = locale === 'pt';
    const html = emailLayout(
      isPt ? 'Acesso ao curso não aprovado' : 'Course Access Not Approved',
      isPt ? `Sua solicitação para ${trackName} não foi aprovada` : `Your request for ${trackName} was not approved`,
      isPt
        ? `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Solicitação não aprovada</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Olá ${name}, sua solicitação para participar de <strong style="color:#0f172a;">${trackName}</strong> não foi aprovada no momento.<br/>
            Entre em contato com o administrador se acreditar que isso é um erro.
          </p>`
        : `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Request not approved</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Hi ${name}, your request to join <strong style="color:#0f172a;">${trackName}</strong> was not approved at this time.<br/>
            Please contact your administrator if you believe this is an error.
          </p>`,
      locale,
    );
    const subject = isPt ? `Atualização sobre sua solicitação: ${trackName}` : `Access request update: ${trackName}`;
    return this.send(email, subject, html, 'Enrollment Denied');
  }

  /* ── Reply notification email ──────────────────────────────── */
  async sendReplyNotification(
    recipients: { email: string; name: string; locale?: string }[],
    commenterName: string,
    videoTitle: string,
    replyBody: string,
    videoUrl: string,
  ): Promise<void> {
    for (const r of recipients) {
      const locale = r.locale ?? 'en';
      const isPt = locale === 'pt';
      const html = emailLayout(
        isPt ? `Nova resposta em "${videoTitle}"` : `New reply on "${videoTitle}"`,
        isPt ? `${commenterName} respondeu a uma discussão que você participou` : `${commenterName} replied to a discussion you participated in`,
        isPt
          ? `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Olá ${r.name},<br/><br/>
              <strong style="color:#0f172a;">${commenterName}</strong> respondeu a uma discussão
              que você participou em <strong style="color:#0f172a;">${videoTitle}</strong>.
            </p>
            <div style="border-left:4px solid #1e40af;padding:12px 20px;background:#f0f5ff;border-radius:0 8px 8px 0;margin:20px 0;">
              <p style="margin:0;color:#1e3a5f;font-size:14px;line-height:1.6;">
                ${replyBody.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
              </p>
            </div>
            ${btn(videoUrl, 'Ver discussão')}`
          : `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
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
        locale,
      );
      const subject = isPt ? `${commenterName} respondeu a uma discussão em "${videoTitle}"` : `${commenterName} replied to a discussion on "${videoTitle}"`;
      await this.send(r.email, subject, html, 'Reply Notification');
    }
  }
}
