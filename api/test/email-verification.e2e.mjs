/**
 * End-to-end test for the email-verification flow.
 *
 * This exercises the real NestJS API, the real Postgres database, and a real
 * SMTP conversation (captured by a local SMTP sink). It does not mock any
 * application code or HTTP response.
 *
 * Prerequisites:
 *   - `dms-city` database migrated (`npx prisma migrate deploy`)
 *   - seed data (`npm run seed`)
 *   - production build (`npm run build`)
 *
 * Run with: npm run test:email-verification
 */
import { createServer, connect } from 'node:net';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..');
const API_PREFIX = '/api/v2';

// --- Minimal .env loader (Prisma and the spawned API need DATABASE_URL) -----
const envText = readFileSync(resolve(apiDir, '.env'), 'utf8');
for (const rawLine of envText.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const index = line.indexOf('=');
  const key = line.slice(0, index).trim();
  let value = line.slice(index + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (process.env[key] === undefined) process.env[key] = value;
}

const HTTP_PORT = Number(process.env.E2E_HTTP_PORT ?? 3100);
const SMTP_PORT = Number(process.env.E2E_SMTP_PORT ?? 2525);
const BASE = `http://127.0.0.1:${HTTP_PORT}${API_PREFIX}`;
const TEST_PASSWORD = 'E2ePassword123';
const TEST_ADMIN_PASSWORD = 'E2eAdminPassword123';
const SMTP_USER = 'e2e@example.test';
const SMTP_PASS = 'e2e-app-password';

const messages = [];

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function startSmtpSink() {
  return new Promise((resolvePromise) => {
    const server = createServer((socket) => {
      let buffer = '';
      let inData = false;
      let data = '';
      let authLoginStep = 0;

      socket.write('220 localhost ESMTP e2e\r\n');

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');

        let newline;
        while ((newline = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 2);

          if (inData) {
            if (line === '.') {
              inData = false;
              messages.push(data);
              data = '';
              socket.write('250 2.0.0 Message accepted\r\n');
            } else {
              data += `${line.startsWith('..') ? line.slice(1) : line}\r\n`;
            }
            continue;
          }

          const upper = line.toUpperCase();

          if (authLoginStep === 1) {
            authLoginStep = 2;
            socket.write('334 UGFzc3dvcmQ6\r\n');
            continue;
          }
          if (authLoginStep === 2) {
            authLoginStep = 0;
            socket.write('235 2.7.0 Authentication successful\r\n');
            continue;
          }
          if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
            socket.write(
              '250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250-8BITMIME\r\n250 OK\r\n',
            );
            continue;
          }
          if (upper.startsWith('AUTH PLAIN')) {
            socket.write('235 2.7.0 Authentication successful\r\n');
            continue;
          }
          if (upper === 'AUTH LOGIN') {
            authLoginStep = 1;
            socket.write('334 VXNlcm5hbWU6\r\n');
            continue;
          }
          if (upper.startsWith('MAIL FROM') || upper.startsWith('RCPT TO')) {
            socket.write('250 2.1.0 OK\r\n');
            continue;
          }
          if (upper === 'DATA') {
            inData = true;
            socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
            continue;
          }
          if (upper === 'RSET' || upper === 'NOOP') {
            socket.write('250 2.0.0 OK\r\n');
            continue;
          }
          if (upper === 'QUIT') {
            socket.write('221 2.0.0 Bye\r\n');
            socket.end();
            continue;
          }
          socket.write('250 2.0.0 OK\r\n');
        }
      });

      socket.on('error', () => undefined);
    });

    server.listen(SMTP_PORT, '127.0.0.1', () => resolvePromise(server));
  });
}

async function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolvePromise) => {
      const socket = connect(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolvePromise(true);
      });
      socket.once('error', () => resolvePromise(false));
    });
    if (ok) return;
    await sleep(150);
  }
  throw new Error(`Port ${port} did not become ready in time`);
}

async function waitForMessage(index, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (messages.length > index) return messages[index];
    await sleep(100);
  }
  throw new Error(`SMTP message #${index + 1} was not delivered in time`);
}

function extractCode(rawMessage) {
  const [, ...bodyParts] = rawMessage.split(/\r?\n\r?\n/);
  const body = bodyParts.join('\n');
  const match = body.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  if (!match) throw new Error('No six-digit code found in delivered email');
  return match[1];
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { response, status: response.status, json, text };
}

let assertions = 0;
function check(condition, label, extra) {
  assertions += 1;
  if (!condition) {
    const detail = extra === undefined ? '' : `\n${JSON.stringify(extra, null, 2)}`;
    throw new Error(`Assertion failed: ${label}${detail}`);
  }
  console.log(`  ok  ${label}`);
}

async function main() {
  const prisma = new PrismaClient();
  let apiProcess;
  let smtpServer;
  let adminSnapshot;
  let employee;
  let user;

  const stamp = Date.now();
  const employeeNo = `EMP-E2E-${stamp}`;
  const email = `e2e.${stamp}@example.test`;

  try {
    // --- Test fixtures ------------------------------------------------------
    const office = await prisma.office.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });

    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!admin) {
      throw new Error('Seed data missing: admin user not found. Run `npm run seed`.');
    }
    adminSnapshot = {
      id: admin.id,
      passwordHash: admin.passwordHash,
      mustChangePassword: admin.mustChangePassword,
      emailVerifiedAt: admin.emailVerifiedAt,
    };
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: await argon2.hash(TEST_ADMIN_PASSWORD),
        mustChangePassword: false,
        emailVerifiedAt: admin.emailVerifiedAt ?? new Date(),
      },
    });

    employee = await prisma.employee.create({
      data: {
        employeeNo,
        firstName: 'End',
        lastName: 'ToEnd',
        position: 'Test Employee',
        email,
        officeId: office.id,
        isActive: true,
      },
    });

    // --- Services -----------------------------------------------------------
    smtpServer = await startSmtpSink();

    apiProcess = spawn(process.execPath, ['dist/main.js'], {
      cwd: apiDir,
      env: {
        ...process.env,
        PORT: String(HTTP_PORT),
        NODE_ENV: 'test',
        NODEMAIL_HOST: '127.0.0.1',
        NODEMAIL_PORT: String(SMTP_PORT),
        NODEMAIL_SECURE: 'false',
        NODEMAIL_REQUIRE_TLS: 'false',
        NODEMAIL_USER: SMTP_USER,
        NODEMAIL_PASS: SMTP_PASS,
        NODEMAIL_FROM_ADDRESS: SMTP_USER,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const apiOutput = [];
    apiProcess.stdout.on('data', (chunk) => apiOutput.push(chunk.toString()));
    apiProcess.stderr.on('data', (chunk) => apiOutput.push(chunk.toString()));

    await waitForPort(HTTP_PORT);

    // Fail fast with useful diagnostics if the API crashed during bootstrap.
    if (apiProcess.exitCode !== null) {
      throw new Error(`API exited early:\n${apiOutput.join('')}`);
    }

    console.log('\nAdmin sanity check');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'admin', password: TEST_ADMIN_PASSWORD },
    });
    check(adminLogin.status === 200, 'admin can sign in', adminLogin.json);

    console.log('\nRegistration');
    const register = await request('/auth/register', {
      method: 'POST',
      body: {
        employeeNo,
        username: `e2e${stamp}`,
        email,
        password: TEST_PASSWORD,
      },
    });
    check(register.status === 201, 'registration returns 201', register.json);
    check(
      register.json?.data?.requiresEmailVerification === true,
      'registration requires email verification',
      register.json,
    );
    check(register.json?.data?.email === email, 'registration returns the email');
    check(
      !/dms_at|dms_rt/.test(register.response.headers.getSetCookie().join(';')),
      'registration does not issue a session cookie',
    );

    const userRow = await prisma.user.findUniqueOrThrow({ where: { email } });
    user = userRow;
    check(userRow.emailVerifiedAt === null, 'new user starts unverified');

    const registrationMessage = await waitForMessage(0);
    const code1 = extractCode(registrationMessage);
    check(/^[0-9]{6}$/.test(code1), 'a real six-digit code was emailed');
    check(!register.text.includes(code1), 'API response never contains the OTP');
    check(
      registrationMessage.includes(email),
      'verification email addressed to the registered user',
    );

    console.log('\nLogin gate');
    const blockedLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: email, password: TEST_PASSWORD },
    });
    check(blockedLogin.status === 403, 'unverified login is rejected with 403', blockedLogin.json);
    check(
      blockedLogin.json?.code === 'EMAIL_NOT_VERIFIED',
      'unverified login returns EMAIL_NOT_VERIFIED',
      blockedLogin.json,
    );

    console.log('\nResend cooldown');
    const cooldownResend = await request('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
    check(cooldownResend.status === 200, 'resend during cooldown returns 200');
    check(cooldownResend.json?.data?.sent === false, 'no email sent during cooldown');
    check(
      cooldownResend.json?.data?.resendAvailableInSeconds > 0,
      'cooldown seconds reported',
      cooldownResend.json,
    );

    console.log('\nAttempt limiting');
    const wrongCode = code1 === '000000' ? '111111' : '000000';
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const wrong = await request('/auth/verify-email', {
        method: 'POST',
        body: { email, code: wrongCode },
      });
      check(wrong.status === 400, `incorrect code attempt ${attempt} rejected`);
      check(wrong.json?.code === 'INVALID_CODE', `attempt ${attempt} reports INVALID_CODE`);
    }
    const locked = await request('/auth/verify-email', {
      method: 'POST',
      body: { email, code: wrongCode },
    });
    check(locked.status === 400, 'fifth incorrect attempt rejected');
    check(
      locked.json?.code === 'TOO_MANY_ATTEMPTS',
      'fifth incorrect attempt locks the challenge',
      locked.json,
    );

    console.log('\nResend after lockout');
    const resendAfterLockout = await request('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
    check(resendAfterLockout.json?.data?.sent === true, 'new code is sent after lockout');
    const code2 = extractCode(await waitForMessage(1));
    check(code2 !== code1, 'resend generates a different code');

    console.log('\nExpiration');
    await prisma.emailVerificationCode.update({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await request('/auth/verify-email', {
      method: 'POST',
      body: { email, code: code2 },
    });
    check(expired.status === 400, 'expired code rejected');
    check(expired.json?.code === 'CODE_EXPIRED', 'expired code reports CODE_EXPIRED');

    console.log('\nSuccessful verification');
    const resendAfterExpiry = await request('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
    check(resendAfterExpiry.json?.data?.sent === true, 'code resent after expiry');
    const code3 = extractCode(await waitForMessage(2));

    const verified = await request('/auth/verify-email', {
      method: 'POST',
      body: { email, code: code3 },
    });
    check(verified.status === 200, 'correct code verifies the account', verified.json);
    check(verified.json?.data?.user?.email === email, 'verification returns the user');
    check(
      verified.response.headers
        .getSetCookie()
        .some((cookie) => cookie.startsWith('dms_at=')),
      'verification issues an access-token cookie',
    );

    const verifiedRow = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    check(verifiedRow.emailVerifiedAt !== null, 'emailVerifiedAt is persisted');
    check(
      (await prisma.emailVerificationCode.count({ where: { userId: user.id } })) === 0,
      'verification challenge is consumed (single use)',
    );

    console.log('\nSingle use and login');
    const replay = await request('/auth/verify-email', {
      method: 'POST',
      body: { email, code: code3 },
    });
    check(replay.status === 400, 'replaying a used code is rejected');
    check(replay.json?.code === 'ALREADY_VERIFIED', 'replay reports ALREADY_VERIFIED');

    const login = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: email, password: TEST_PASSWORD },
    });
    check(login.status === 200, 'verified user can sign in', login.json);
    check(
      login.response.headers
        .getSetCookie()
        .some((cookie) => cookie.startsWith('dms_at=')),
      'login issues an access-token cookie',
    );

    console.log(`\nAll ${assertions} assertions passed.`);
  } catch (error) {
    console.error('\nE2E test failed:', error instanceof Error ? error.message : error);
    if (apiProcess && apiProcess.exitCode === null) apiProcess.kill('SIGTERM');
    throw error;
  } finally {
    if (apiProcess && apiProcess.exitCode === null) {
      apiProcess.kill('SIGTERM');
      await sleep(300);
      if (apiProcess.exitCode === null) apiProcess.kill('SIGKILL');
    }
    if (smtpServer) {
      await new Promise((resolvePromise) => smtpServer.close(() => resolvePromise()));
    }

    try {
      if (user) {
        await prisma.user.deleteMany({ where: { id: user.id } });
      } else if (employee) {
        await prisma.user.deleteMany({ where: { employeeId: employee.id } });
      }
      if (employee) {
        await prisma.employee.deleteMany({ where: { id: employee.id } });
      }
      if (adminSnapshot) {
        await prisma.user.update({
          where: { id: adminSnapshot.id },
          data: {
            passwordHash: adminSnapshot.passwordHash,
            mustChangePassword: adminSnapshot.mustChangePassword,
            emailVerifiedAt: adminSnapshot.emailVerifiedAt,
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch(() => {
  process.exitCode = 1;
});
