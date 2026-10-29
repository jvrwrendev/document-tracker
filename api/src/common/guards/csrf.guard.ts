import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { COOKIE_NAMES, CSRF_HEADER } from '../constants/cookie.constants';
import { API_PREFIX } from '../constants/api.constants';
import { IS_PUBLIC_METADATA_KEY } from '../decorators/public.decorator';
import { Reflector } from '@nestjs/core';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SKIP_PATHS = [
  `${API_PREFIX}/auth/login`,
  `${API_PREFIX}/auth/refresh`,
  `${API_PREFIX}/auth/register`,
  `${API_PREFIX}/auth/verify-email`,
  `${API_PREFIX}/auth/resend-verification`,
  `${API_PREFIX}/auth/forgot-password`,
  `${API_PREFIX}/auth/reset-password`,
];

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic && SKIP_PATHS.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
      return true;
    }

    const cookieToken = (req.cookies?.[COOKIE_NAMES.CSRF] as string | undefined) ?? '';
    const headerToken = this.readHeader(req, CSRF_HEADER);

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (cookieToken.length !== headerToken.length) {
      throw new ForbiddenException('CSRF token invalid');
    }

    const ok = timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken),
    );

    if (!ok) {
      throw new ForbiddenException('CSRF token invalid');
    }
    return true;
  }

  private readHeader(req: Request, header: string): string | undefined {
    const v = req.headers[header];
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v[0];
    return undefined;
  }
}
