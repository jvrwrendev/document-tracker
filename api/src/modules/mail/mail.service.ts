import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { MailConfig } from '../../config/mail.config';
import { NodemailConfig } from '../../config/nodemail.config';

export type CredentialsEmailStatus = 'sent' | 'skipped' | 'failed';

export interface AccountCreatedEmailInput {
  to: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
}

export interface VerificationCodeEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
}

interface SendInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly config: MailConfig;
  private readonly nodemail: NodemailConfig;
  private transport: Transporter | null = null;
  private verificationTransport: Transporter | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.get<MailConfig>('mail') ?? ({} as MailConfig);
    this.nodemail =
      configService.get<NodemailConfig>('nodemail') ?? ({} as NodemailConfig);
  }

  get isConfigured(): boolean {
    return Boolean(this.config.host && this.config.fromAddress);
  }

  get isVerificationConfigured(): boolean {
    return Boolean(this.nodemail.user && this.nodemail.pass);
  }

  get recipientName(): string {
    return this.config.fromName;
  }

  private getTransport(): Transporter | null {
    if (!this.isConfigured) return null;
    if (!this.transport) {
      this.transport = createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        requireTLS: this.config.requireTls,
        auth:
          this.config.user
            ? { user: this.config.user, pass: this.config.pass }
            : undefined,
      });
    }
    return this.transport;
  }

  private getVerificationTransport(): Transporter | null {
    if (!this.isVerificationConfigured) return null;
    if (!this.verificationTransport) {
      this.verificationTransport = createTransport({
        host: this.nodemail.host,
        port: this.nodemail.port,
        secure: this.nodemail.secure,
        requireTLS: this.nodemail.requireTls,
        auth: {
          user: this.nodemail.user,
          pass: this.nodemail.pass,
        },
      });
    }
    return this.verificationTransport;
  }

  async send(input: SendInput): Promise<void> {
    const transport = this.getTransport();
    if (!transport) {
      const missing = [this.config.host ? null : 'MAIL_HOST', this.config.fromAddress ? null : 'MAIL_FROM_ADDRESS/MAIL_USER']
        .filter(Boolean)
        .join(', ');
      this.logger.warn(
        `Email to ${input.to} skipped: SMTP is not configured (missing ${missing}).`,
      );
      return;
    }
    await transport.sendMail({
      from: {
        name: this.config.fromName,
        address: this.config.fromAddress,
      },
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }

  async sendTest(to: string): Promise<void> {
    const subject = 'DMS Test Email';
    const text = [
      'This is a test email from the DMS application.',
      '',
      'If you received this message, email delivery is configured correctly.',
    ].join('\n');
    const html = [
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:520px;margin:0 auto;">',
      '<h2 style="color:#1d4ed8;">DMS Test Email</h2>',
      '<p>This is a test email from the DMS application.</p>',
      '<p>If you received this message, email delivery is configured correctly.</p>',
      '<p style="color:#64748b;font-size:12px;">This is an automated message from the DMS.</p>',
      '</div>',
    ].join('');
    try {
      await this.send({ to, subject, text, html });
    } catch (err) {
      this.logger.error(
        `Test email to ${to} failed.`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async sendAccountCreated(input: AccountCreatedEmailInput): Promise<void> {
    const firstName =
      input.fullName.trim().split(/\s+/)[0] || input.fullName;
    const subject = 'Your DMS Account Has Been Created';
    const text = [
      `Dear ${firstName},`,
      '',
      'Your DMS account has been successfully created.',
      '',
      `Email: ${input.email}`,
      `Temporary Password: ${input.temporaryPassword}`,
      '',
      `Please log in at ${this.config.loginUrl} using these credentials and change your temporary password immediately after your first login.`,
    ].join('\n');
    const html = [
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:520px;margin:0 auto;">',
      '<h2 style="color:#1d4ed8;">Your DMS Account Has Been Created</h2>',
      `<p>Dear ${firstName},</p>`,
      '<p>Your DMS account has been successfully created.</p>',
      '<table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin:16px 0;width:100%;">',
      `<tr><td style="padding:4px 0;color:#475569;">Email</td><td style="padding:4px 0;font-weight:600;">${input.email}</td></tr>`,
      `<tr><td style="padding:4px 0;color:#475569;">Temporary Password</td><td style="padding:4px 0;font-weight:600;letter-spacing:1px;">${input.temporaryPassword}</td></tr>`,
      '</table>',
      `<p>Please log in at <a href="${this.config.loginUrl}" style="color:#1d4ed8;">${this.config.loginUrl}</a> using these credentials and change your temporary password immediately after your first login.</p>`,
      '<p style="color:#64748b;font-size:12px;">This is an automated message from the DMS. Do not reply to this email.</p>',
      '</div>',
    ].join('');
    await this.send({ to: input.to, subject, text, html });
  }

  /**
   * Sends a six-digit email verification code through the dedicated Gmail SMTP
   * transport. The code must never be logged by this method or its callers.
   */
  async sendVerificationCode(input: VerificationCodeEmailInput): Promise<void> {
    const transport = this.getVerificationTransport();
    if (!transport) {
      throw new Error(
        'Verification email is not configured (NODEMAIL_USER/NODEMAIL_PASS missing).',
      );
    }

    const minutes = Math.max(1, Math.round(input.expiresInMinutes));
    const subject = 'Your CityDocs DMS verification code';
    const text = [
      'Your CityDocs DMS verification code is:',
      '',
      input.code,
      '',
      `This code expires in ${minutes} minutes and can be used only once.`,
      'If you did not create a DMS account, you can ignore this email.',
    ].join('\n');
    const html = [
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:520px;margin:0 auto;">',
      '<h2 style="color:#1d4ed8;margin:0 0 12px;">Verify your email address</h2>',
      '<p style="margin:0 0 16px;">Use the code below to finish creating your CityDocs DMS account.</p>',
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;text-align:center;margin:0 0 16px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:10px;color:#0f172a;">${input.code}</span>
      </div>`,
      `<p style="margin:0 0 8px;">This code expires in <strong>${minutes} minutes</strong> and can be used only once.</p>`,
      '<p style="color:#64748b;font-size:12px;margin-top:24px;">If you did not create a DMS account, you can ignore this email. Do not reply to this message.</p>',
      '</div>',
    ].join('');

    await transport.sendMail({
      from: {
        name: this.nodemail.fromName,
        address: this.nodemail.fromAddress || this.nodemail.user,
      },
      to: input.to,
      subject,
      text,
      html,
    });
  }
}