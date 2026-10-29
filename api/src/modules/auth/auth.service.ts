import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  constantTimeVerify,
  hashPassword,
  verifyPassword,
} from '../../common/utils/hash.util';
import { randomToken, sha256Hex } from '../../common/utils/token.util';
import { normalizeClientIp } from '../../common/utils/ip.util';
import { AuthConfig, SameSite } from '../../config/auth.config';
import { COOKIE_NAMES, COOKIE_PATHS } from '../../common/constants/cookie.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  RegisterResponseDto,
  ResendVerificationResponseDto,
} from './dto/email-verification-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthResponseDto,
  AuthenticatedUserDto,
  SessionDto,
} from './dto/authenticated-user.dto';
import { Request, Response } from 'express';
import type { CookieOptions } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RolesService } from '../roles/roles.service';
import { MailService } from '../mail/mail.service';

type AuthUserWithEmployee = Prisma.UserGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        officeId: true;
        position: true;
        firstName: true;
        middleName: true;
        lastName: true;
        phone: true;
        email: true;
        office: { select: { id: true; name: true; code: true; type: true } };
      };
    };
  };
}>;

const employeeSelect = {
  id: true,
  officeId: true,
  position: true,
  firstName: true,
  middleName: true,
  lastName: true,
  phone: true,
  email: true,
  office: { select: { id: true, name: true, code: true, type: true } },
} as const;

function toExpressSameSite(value: SameSite): 'strict' | 'lax' | 'none' {
  return value.toLowerCase() as 'strict' | 'lax' | 'none';
}

function parseTtlMs(ttl: string): number {
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(ttl.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2] ?? 'ms';
  switch (unit) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return n;
  }
}

const RESET_TOKEN_TTL = '30m';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;
  private readonly csrfTtlMs: number;
  private readonly trustProxy: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly rolesService: RolesService,
    private readonly mailService: MailService,
  ) {
    const authCfg = this.configService.getOrThrow<AuthConfig>('auth');
    this.accessTtlMs = parseTtlMs(authCfg.access.ttl);
    this.refreshTtlMs = parseTtlMs(authCfg.refresh.ttl);
    this.csrfTtlMs = this.refreshTtlMs;
    this.trustProxy = authCfg.trustProxy ?? false;
  }

  // ---------- Public API ----------

  async login(dto: LoginDto, req: Request, res: Response): Promise<AuthResponseDto> {
    const identifier = dto.emailOrUsername.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: { employee: { select: employeeSelect } },
    });

    const ok = await constantTimeVerify(dto.password, user?.passwordHash ?? null);

    if (!user || !ok) {
      this.logFailedAttempt(req, identifier);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerifiedAt) {
      this.logger.log(`Login blocked for unverified account ${user.id}`);
      throw new ForbiddenException({
        message: 'Please verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const { sessionId, refreshRaw } = await this.issueSession(user.id);
    const accessToken = this.signAccessToken(user.id, user.role, sessionId);
    const csrfRaw = randomToken(32);
    this.setAuthCookies(res, accessToken, refreshRaw, this.refreshTtlMs, csrfRaw);

    return { user: await this.toUserDto(user) };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    req: Request,
  ): Promise<{ resetToken: string; resetUrl: string }> {
    const identifier = dto.emailOrUsername.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      select: { id: true, status: true },
    });

    // Never reveal whether an account exists.
    if (!user || user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'If an account exists, a password reset link has been generated.',
      );
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset' },
      {
        secret: this.configService.getOrThrow<AuthConfig>('auth').refresh.secret,
        expiresIn: RESET_TOKEN_TTL,
      },
    );

    const origin = this.resolveFrontendOrigin(req);
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(resetToken)}`;

    this.logger.log(`Password reset link requested for user ${user.id}`);
    return { resetToken, resetUrl };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    let subject: string;
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(dto.token, {
        secret: this.configService.getOrThrow<AuthConfig>('auth').refresh.secret,
      });
      if (payload.type !== 'password-reset' || !payload.sub) {
        throw new Error('Invalid reset token type');
      }
      subject = payload.sub;
    } catch {
      throw new BadRequestException('This password reset link is invalid or has expired.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: { id: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new BadRequestException('This password reset link is invalid or has expired.');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        authSessions: {
          updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } },
        },
      },
    });

    this.logger.log(`Password reset completed for user ${user.id}`);
  }

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    if (!this.mailService.isVerificationConfigured) {
      throw new ServiceUnavailableException(
        'Email verification is not configured. Please contact your system administrator.',
      );
    }

    const employeeNo = dto.employeeNo.trim();

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      include: { user: { select: { id: true } } },
    });

    if (!employee || !employee.isActive) {
      throw new BadRequestException('Invalid employee number');
    }
    if (employee.user) {
      throw new ConflictException('A user account already exists for this employee');
    }

    const providedEmail = dto.email?.trim().toLowerCase();
    if (providedEmail && providedEmail !== employee.email.toLowerCase()) {
      throw new BadRequestException('Email does not match the employee record');
    }
    const email = providedEmail ?? employee.email.toLowerCase();

    const username = dto.username?.trim();
    if (username) {
      const taken = await this.prisma.user.findUnique({ where: { username } });
      if (taken) {
        throw new ConflictException('Username is already taken');
      }
    }

    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      throw new ConflictException('Email is already taken');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: username ?? null,
        email,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: null,
        employeeId: employee.id,
      },
      select: { id: true },
    });

    try {
      const { code } = await this.createVerificationChallenge(user.id);
      await this.mailService.sendVerificationCode({
        to: email,
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_MS / 60_000,
      });
    } catch (err) {
      // The account must not exist without a usable verification challenge;
      // otherwise the employee could never register again.
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      this.logger.error(
        `Failed to send verification email for user ${user.id}.`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        'We could not send the verification email right now. Please try again shortly.',
      );
    }

    this.logger.log(
      `Registered unverified user ${user.id} for employee ${employee.employeeNo}`,
    );

    return {
      requiresEmailVerification: true,
      email,
      expiresInSeconds: VERIFICATION_CODE_TTL_MS / 1000,
      resendAvailableInSeconds: VERIFICATION_RESEND_COOLDOWN_MS / 1000,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, res: Response): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { employee: { select: employeeSelect } },
    });

    if (!user) {
      // Keep the failure path timing-comparable to a real code check.
      await constantTimeVerify(dto.code, null);
      throw new BadRequestException({
        code: 'INVALID_CODE',
        message: 'That verification code is incorrect.',
      });
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException({
        code: 'ALREADY_VERIFIED',
        message: 'This email address is already verified. You can sign in.',
      });
    }

    const challenge = await this.prisma.emailVerificationCode.findUnique({
      where: { userId: user.id },
    });

    if (!challenge) {
      throw new BadRequestException({
        code: 'CODE_EXPIRED',
        message: 'This verification code has expired. Request a new one.',
      });
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.prisma.emailVerificationCode.deleteMany({
        where: { userId: user.id },
      });
      throw new BadRequestException({
        code: 'CODE_EXPIRED',
        message: 'This verification code has expired. Request a new one.',
      });
    }

    if (challenge.attempts >= VERIFICATION_MAX_ATTEMPTS) {
      await this.prisma.emailVerificationCode.deleteMany({
        where: { userId: user.id },
      });
      throw new BadRequestException({
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many incorrect attempts. Request a new verification code.',
      });
    }

    const ok = await verifyPassword(challenge.codeHash, dto.code);
    if (!ok) {
      const attempts = challenge.attempts + 1;
      if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
        await this.prisma.emailVerificationCode.deleteMany({
          where: { userId: user.id },
        });
        throw new BadRequestException({
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many incorrect attempts. Request a new verification code.',
        });
      }

      await this.prisma.emailVerificationCode.update({
        where: { userId: user.id },
        data: { attempts },
      });
      const remaining = VERIFICATION_MAX_ATTEMPTS - attempts;
      throw new BadRequestException({
        code: 'INVALID_CODE',
        message: `That verification code is incorrect. ${remaining} ${
          remaining === 1 ? 'attempt' : 'attempts'
        } remaining.`,
      });
    }

    const verifiedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: verifiedAt },
      }),
      this.prisma.emailVerificationCode.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    const { sessionId, refreshRaw } = await this.issueSession(user.id);
    const accessToken = this.signAccessToken(user.id, user.role, sessionId);
    const csrfRaw = randomToken(32);
    this.setAuthCookies(res, accessToken, refreshRaw, this.refreshTtlMs, csrfRaw);

    this.logger.log(`Email verified for user ${user.id}`);
    return { user: await this.toUserDto({ ...user, emailVerifiedAt: verifiedAt }) };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<ResendVerificationResponseDto> {
    if (!this.mailService.isVerificationConfigured) {
      throw new ServiceUnavailableException(
        'Email verification is not configured. Please contact your system administrator.',
      );
    }

    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true },
    });

    const generic: ResendVerificationResponseDto = {
      success: true,
      sent: false,
      expiresInSeconds: VERIFICATION_CODE_TTL_MS / 1000,
      resendAvailableInSeconds: VERIFICATION_RESEND_COOLDOWN_MS / 1000,
    };

    // Do not reveal whether an account exists or is already verified.
    if (!user || user.emailVerifiedAt) {
      return generic;
    }

    const existing = await this.prisma.emailVerificationCode.findUnique({
      where: { userId: user.id },
      select: { lastSentAt: true, expiresAt: true },
    });
    if (existing) {
      const elapsed = Date.now() - existing.lastSentAt.getTime();
      if (elapsed < VERIFICATION_RESEND_COOLDOWN_MS) {
        return {
          ...generic,
          resendAvailableInSeconds: Math.max(
            1,
            Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - elapsed) / 1000),
          ),
          expiresInSeconds: Math.max(
            1,
            Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000),
          ),
        };
      }
    }

    try {
      const { code } = await this.createVerificationChallenge(user.id);
      await this.mailService.sendVerificationCode({
        to: user.email ?? email,
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_MS / 60_000,
      });
    } catch (err) {
      await this.prisma.emailVerificationCode
        .deleteMany({ where: { userId: user.id } })
        .catch(() => undefined);
      this.logger.error(
        `Failed to resend verification email for user ${user.id}.`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        'We could not send the verification email right now. Please try again shortly.',
      );
    }

    this.logger.log(`Verification code resent for user ${user.id}`);
    return { ...generic, sent: true };
  }

  async refresh(req: Request, res: Response): Promise<AuthResponseDto> {
    const raw = (req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined) ?? null;
    if (!raw) {
      this.clearAllCookies(res);
      throw new UnauthorizedException('Invalid session');
    }
    const hash = sha256Hex(raw);
    const session = await this.prisma.authSession.findFirst({
      where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      this.clearAllCookies(res);
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { employee: { select: employeeSelect } },
    });
    if (!user || user.status !== 'ACTIVE') {
      this.clearAllCookies(res);
      throw new UnauthorizedException('Invalid session');
    }

    // Rotate: revoke old, issue new
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const { sessionId: newSessionId, refreshRaw: newRefreshRaw } = await this.issueSession(user.id);
    const accessToken = this.signAccessToken(user.id, user.role, newSessionId);
    const csrfRaw = randomToken(32);
    this.setAuthCookies(res, accessToken, newRefreshRaw, this.refreshTtlMs, csrfRaw);

    return { user: await this.toUserDto(user) };
  }

  async logout(req: Request, res: Response, sessionId?: string): Promise<void> {
    const raw = (req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined) ?? null;
    if (raw) {
      const hash = sha256Hex(raw);
      await this.prisma.authSession.updateMany({
        where: { tokenHash: hash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    if (sessionId) {
      await this.prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearAllCookies(res);
  }

  async me(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: employeeSelect } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }
    return this.toUserDto(user);
  }

  async listSessions(userId: string, currentSessionId: string | null): Promise<SessionDto[]> {
    const rows = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt,
      expiresAt: r.expiresAt,
      revokedAt: r.revokedAt,
      current: r.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }
    const ok = await constantTimeVerify(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        authSessions: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
    });
  }

  async firstLoginChangePassword(
    userId: string,
    newPassword: string,
  ): Promise<{ user: AuthenticatedUserDto }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: employeeSelect } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }
    if (!user.mustChangePassword) {
      throw new BadRequestException(
        'A first-login password change is not required for this account.',
      );
    }
    const passwordHash = await hashPassword(newPassword);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
      include: { employee: { select: employeeSelect } },
    });
    return { user: await this.toUserDto(updated) };
  }

  async updateMe(userId: string, dto: UpdateMyProfileDto): Promise<AuthenticatedUserDto> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: { id: true } } },
    });
    if (!existing) {
      throw new UnauthorizedException('Invalid session');
    }

    if (!existing.employee) {
      throw new BadRequestException('No employee record is linked to this account');
    }

    if (email !== (existing.email ?? '').toLowerCase()) {
      const userEmailTaken = await this.prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (userEmailTaken) {
        throw new ConflictException('Email is already used by another account');
      }
      const employeeEmailTaken = await this.prisma.employee.findFirst({
        where: { email, NOT: { id: existing.employee.id } },
        select: { id: true },
      });
      if (employeeEmailTaken) {
        throw new ConflictException('Email is already used by another employee record');
      }
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email },
        include: { employee: { select: employeeSelect } },
      }),
      this.prisma.employee.update({
        where: { id: existing.employee.id },
        data: {
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() ? dto.middleName.trim() : null,
          lastName: dto.lastName.trim(),
          position: dto.position.trim(),
          email,
          phone: dto.phone?.trim() ? dto.phone.trim() : null,
        },
      }),
    ]);

    return this.toUserDto(updatedUser);
  }

  // ---------- Internals ----------

  /**
   * Generates a cryptographically random six-digit code, stores only its argon2
   * hash, and resets the attempt counter. The plaintext is returned to the
   * caller solely so it can be delivered by email.
   */
  private async createVerificationChallenge(
    userId: string,
  ): Promise<{ code: string }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await hashPassword(code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + VERIFICATION_CODE_TTL_MS);

    await this.prisma.emailVerificationCode.upsert({
      where: { userId },
      create: {
        userId,
        codeHash,
        expiresAt,
        lastSentAt: now,
        attempts: 0,
      },
      update: {
        codeHash,
        expiresAt,
        lastSentAt: now,
        attempts: 0,
      },
    });

    return { code };
  }

  private async issueSession(userId: string): Promise<{ sessionId: string; refreshRaw: string }> {
    const refreshRaw = randomToken(64);
    const refreshHash = sha256Hex(refreshRaw);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const session = await this.prisma.authSession.create({
      data: { userId, tokenHash: refreshHash, expiresAt },
      select: { id: true },
    });
    return { sessionId: session.id, refreshRaw };
  }

  private signAccessToken(userId: string, role: Role, sessionId: string): string {
    const payload: JwtPayload = { sub: userId, role, sid: sessionId };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<AuthConfig>('auth').access.secret,
      expiresIn: `${this.accessTtlMs}ms`,
    });
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshRaw: string,
    refreshMaxAgeMs: number,
    csrfRaw: string,
  ): void {
    const authCfg = this.configService.getOrThrow<AuthConfig>('auth');
    const sameSite = toExpressSameSite(authCfg.cookie.sameSite);
    const base: Pick<CookieOptions, 'secure' | 'sameSite' | 'domain'> = {
      secure: authCfg.cookie.secure,
      sameSite,
      domain: authCfg.cookie.domain,
    };
    const accessOpts: CookieOptions = {
      ...base,
      httpOnly: true,
      path: COOKIE_PATHS.ACCESS,
      maxAge: this.accessTtlMs,
    };
    const refreshOpts: CookieOptions = {
      ...base,
      httpOnly: true,
      path: COOKIE_PATHS.REFRESH,
      maxAge: refreshMaxAgeMs,
    };
    const csrfOpts: CookieOptions = {
      ...base,
      httpOnly: false,
      path: COOKIE_PATHS.CSRF,
      maxAge: this.csrfTtlMs,
    };

    res.cookie(COOKIE_NAMES.ACCESS, accessToken, accessOpts);
    res.cookie(COOKIE_NAMES.REFRESH, refreshRaw, refreshOpts);
    res.cookie(COOKIE_NAMES.CSRF, csrfRaw, csrfOpts);
  }

  private clearAllCookies(res: Response): void {
    const authCfg = this.configService.getOrThrow<AuthConfig>('auth');
    const opts: Pick<CookieOptions, 'secure' | 'sameSite' | 'domain'> = {
      secure: authCfg.cookie.secure,
      sameSite: toExpressSameSite(authCfg.cookie.sameSite),
      domain: authCfg.cookie.domain,
    };
    res.clearCookie(COOKIE_NAMES.ACCESS, { ...opts, path: COOKIE_PATHS.ACCESS });
    res.clearCookie(COOKIE_NAMES.REFRESH, { ...opts, path: COOKIE_PATHS.REFRESH });
    res.clearCookie(COOKIE_NAMES.CSRF, { ...opts, path: COOKIE_PATHS.CSRF });
  }

  private logFailedAttempt(req: Request, identifier: string): void {
    const ip = normalizeClientIp(req, this.trustProxy) ?? 'unknown';
    this.logger.warn(`Login failed for "${identifier}" from ${ip}`);
  }

  private resolveFrontendOrigin(req: Request): string {
    const fallback = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const origin = req.headers.origin;
    if (origin && /^https?:\/\/.+/.test(origin)) {
      return origin.replace(/\/+$/, '');
    }
    const referer = req.headers.referer;
    if (referer) {
      try {
        return new URL(referer).origin;
      } catch {
        // fall through
      }
    }
    return fallback.replace(/\/+$/, '');
  }

  private async toUserDto(user: AuthUserWithEmployee): Promise<AuthenticatedUserDto> {
    const permissions = await this.rolesService.effectivePermissions(user.role);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      permissions,
      officeId: user.employee?.officeId ?? null,
      office: user.employee?.office
        ? {
            id: user.employee.office.id,
            name: user.employee.office.name,
            code: user.employee.office.code,
            type: String(user.employee.office.type),
          }
        : null,
      position: user.employee?.position ?? null,
      employeeId: user.employee?.id ?? null,
      firstName: user.employee?.firstName ?? null,
      middleName: user.employee?.middleName ?? null,
      lastName: user.employee?.lastName ?? null,
      phone: user.employee?.phone ?? null,
      avatarColor: null,
      createdAt: user.createdAt,
    };
  }
}
