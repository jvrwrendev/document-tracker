import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  username: string | null;
  role: Role;
  status: AccountStatus;
  sessionId: string | null;
  employee?: {
    id: string;
    officeId: string | null;
  } | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
