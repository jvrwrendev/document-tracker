import { registerAs } from '@nestjs/config';

export interface NodemailConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
}

/**
 * Dedicated SMTP transport for transactional verification email.
 *
 * Defaults to Gmail SMTP with STARTTLS on port 587. `NODEMAIL_PASS` must be a
 * Google App Password — never the account's normal password. The host/port/
 * TLS overrides exist for local SMTP capture servers during automated tests.
 */
export default registerAs<NodemailConfig>('nodemail', () => {
  const user = (process.env.NODEMAIL_USER ?? '').trim();

  return {
    host: (process.env.NODEMAIL_HOST ?? '').trim() || 'smtp.gmail.com',
    port: parseInt(process.env.NODEMAIL_PORT ?? '587', 10),
    secure: (process.env.NODEMAIL_SECURE ?? 'false').toLowerCase() === 'true',
    requireTls: (process.env.NODEMAIL_REQUIRE_TLS ?? 'true').toLowerCase() === 'true',
    user,
    // Google displays App Passwords in groups of four; strip whitespace so a
    // pasted value still authenticates.
    pass: (process.env.NODEMAIL_PASS ?? '').replace(/\s+/g, ''),
    fromName: process.env.NODEMAIL_FROM_NAME ?? process.env.MAIL_FROM_NAME ?? 'CityDocs DMS',
    fromAddress: (process.env.NODEMAIL_FROM_ADDRESS ?? '').trim() || user,
  };
});
