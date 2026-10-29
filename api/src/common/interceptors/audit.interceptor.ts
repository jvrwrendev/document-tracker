import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      // No authenticated user â€” let the request proceed; auth guard will fail it.
      return next.handle();
    }

    const params = request.params as Record<string, string>;
    const targetId =
      params.id ?? params.documentId ?? params.userId ?? params.officeId;
    const ipAddress =
      (request.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ?? request.socket.remoteAddress ?? undefined;
    const userAgent = (request.headers['user-agent'] as string | undefined) ?? undefined;
    const safeBody = this.sanitizeBody(request.body);

    return next.handle().pipe(
      tap({
        next: (result) => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          const metadata = {
            method: request.method,
            path: request.url,
            status: response.statusCode,
            params,
            query: request.query,
            body: safeBody,
            responsePreview:
              result && typeof result === 'object' && 'data' in (result as object)
                ? (result as { data: { id?: string } }).data?.id
                : undefined,
            deletedCount:
              result && typeof result === 'object' && 'deletedCount' in (result as object)
                ? (result as { deletedCount?: number }).deletedCount
                : undefined,
            actorRole: user.role,
            actorOfficeId: user.employee?.officeId ?? null,
          };

          // Best-effort write; failures here MUST NOT roll back business writes,
          // but they MUST be visible to ops.
          this.prisma.auditLog
            .create({
              data: {
                actorId: user.id,
                action: meta.action,
                module: meta.module,
                description: this.describe(meta, request, result),
                targetId,
                targetType: meta.targetType ?? this.guessTargetType(request.url),
                ipAddress,
                userAgent,
                metadata: metadata as Prisma.InputJsonValue,
              },
            })
            .catch((err: unknown) => {
              this.logger.error(
                `Audit write failed for ${meta.module}.${meta.action}: ${(err as Error).message}`,
                (err as Error).stack,
              );
            });
        },
        error: (err) => {
          // Log failed attempts; useful for security review.
          this.prisma.auditLog
            .create({
              data: {
                actorId: user.id,
                action: `${meta.action}.failed`,
                module: meta.module,
                description: `${meta.action} failed at ${request.method} ${request.url}`,
                targetId,
                targetType: meta.targetType ?? this.guessTargetType(request.url),
                ipAddress,
                userAgent,
                metadata: {
                  method: request.method,
                  path: request.url,
                  params,
                  error: (err as Error)?.message ?? 'unknown',
                } as Prisma.InputJsonValue,
              },
            })
            .catch((auditErr: unknown) => {
              this.logger.error(
                `Failed-audit write failed: ${(auditErr as Error).message}`,
              );
            });
        },
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const banned = new Set([
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'temporaryPassword',
      'token',
      'refreshToken',
    ]);
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (banned.has(k)) {
        clone[k] = '[REDACTED]';
      } else if (typeof v === 'string' && v.length > 2_000) {
        clone[k] = '[TRUNCATED]';
      } else {
        clone[k] = v;
      }
    }
    return clone;
  }

  private guessTargetType(url: string): string {
    if (url.startsWith('/documents')) return 'Document';
    if (url.startsWith('/document-routing')) return 'DocumentRoutingStep';
    if (url.startsWith('/document-review')) return 'DocumentReview';
    if (url.startsWith('/document-attachments')) return 'DocumentAttachment';
    if (url.startsWith('/users')) return 'User';
    if (url.startsWith('/offices')) return 'Office';
    if (url.startsWith('/document-types')) return 'DocumentType';
    return 'Unknown';
  }

  private describe(meta: AuditMetadata, request: Request, result: unknown): string {
const body = (request.body ?? {}) as Record<string, unknown>;
    const fromStatus = typeof body.fromStatus === 'string' ? body.fromStatus : undefined;
    const actionKind = typeof body.action === 'string' ? body.action : undefined;

    switch (meta.action) {
      case 'document.register':
        return `Document registered (${String(body.title ?? 'untitled')})`;
      case 'document.receive':
        return 'Document received by a recipient office';
      case 'document.delete':
        return `Document deleted`;
      case 'document.delete-all': {
        const count =
          result && typeof result === 'object' && 'deletedCount' in (result as object)
            ? (result as { deletedCount?: number }).deletedCount
            : undefined;
        return `All documents deleted (${count ?? 'unknown'} affected)`;
      }
      case 'document.assign-holder':
        return `Holder assigned (${String(body.holderId ?? body.holder ?? '') || 'unset'})`;
      case 'review.create':
        return `Review: ${actionKind ?? 'commented'}`;
      case 'routing.create-plan':
        return `Routing plan created`;
      case 'routing.advance':
        return `Routing step advanced to ${String(body.status ?? '?')}`;
      case 'attachment.upload':
        return `Attachment uploaded: ${String((request as { file?: { originalname?: string } }).file?.originalname ?? '?')}`;
      case 'attachment.delete':
        return `Attachment deleted`;
      case 'user.create':
        return `User created: ${String(body.username ?? body.email ?? '?')}`;
      case 'user.update':
        return `User updated`;
      case 'user.delete':
        return `User deleted`;
      case 'user.reset-password':
        return `User password reset`;
      case 'office.create':
        return `Office created: ${String(body.name ?? '?')}`;
      case 'office.update':
        return `Office updated`;
      case 'employee.create':
        return `Employee created: ${String(body.firstName ?? '')} ${String(body.lastName ?? '')}`.trim();
      case 'employee.update':
        return `Employee updated`;
      case 'employee.delete':
        return `Employee deleted`;
      default:
        return `${meta.action} via ${request.method} ${request.url}`;
    }
  }
}
