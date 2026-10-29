import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { hashPassword } from '../../common/utils/hash.util';
import { throwOnUniqueConflict } from '../../common/utils/prisma-unique.util';
import {
  CredentialsEmailStatus,
  MailService,
} from '../mail/mail.service';

type UserWithEmployee = Prisma.UserGetPayload<{
  include: {
    employee: {
      include: {
        office: true;
      };
    };
  };
}>;

const userWithEmployeeInclude = {
  employee: {
    include: {
      office: true,
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateUserDto,
  ): Promise<{
    user: UserWithEmployee;
    credentialsEmailStatus: CredentialsEmailStatus;
    credentialsEmailReason?: string;
  }> {
    const temporaryPassword = this.generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    let user: UserWithEmployee;
    try {
      user = await this.prisma.user.create({
        data: {
          username: dto.username ?? null,
          email: dto.email ?? null,
          passwordHash,
          role: dto.role ?? 'DOCUMENT_ENCODER',
          status: dto.status ?? 'ACTIVE',
          mustChangePassword: true,
          emailVerifiedAt: new Date(),
          employeeId: dto.employeeId,
        },
        include: userWithEmployeeInclude,
      });
    } catch (err) {
      throwOnUniqueConflict(err, {
        email: 'A user account with this email address already exists.',
        username: 'This username is already taken.',
        employeeId: 'This person already has a user account.',
      });
    }

    const delivery = await this.deliverCredentials(user, temporaryPassword);

    return {
      user,
      credentialsEmailStatus: delivery.status,
      credentialsEmailReason: delivery.reason,
    };
  }

  async findAll(filter: FilterUsersDto): Promise<PaginatedResult<UserWithEmployee>> {
    const { page, pageSize, search, role, status, officeId, order } = filter;
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { middleName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { employeeNo: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (officeId) where.employee = { officeId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userWithEmployeeInclude,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findRoutingOptions(): Promise<Array<{
    id: string;
    fullName: string;
    email: string | null;
    role: string;
    officeId: string | null;
    officeName: string | null;
    position: string | null;
  }>> {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: {
        employee: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            position: true,
            officeId: true,
            office: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map(user => ({
      id: user.id,
      fullName:
        [user.employee?.firstName, user.employee?.middleName, user.employee?.lastName]
          .filter(Boolean)
          .join(' ') || user.username || user.email || user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      officeId: user.employee?.officeId ?? null,
      officeName: user.employee?.office?.name ?? null,
      position: user.employee?.position ?? null,
    }));
  }

  async findOne(id: string): Promise<UserWithEmployee> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: userWithEmployeeInclude,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserWithEmployee> {
    const { password, ...rest } = dto;
    const data: Prisma.UserUpdateInput = {};
    if (rest.username !== undefined) data.username = rest.username;
    if (rest.email !== undefined) data.email = rest.email;
    if (rest.role !== undefined) data.role = rest.role;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.employeeId !== undefined) data.employee = { connect: { id: rest.employeeId } };
    if (password) {
      data.passwordHash = await hashPassword(password);
    }
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        include: userWithEmployeeInclude,
      });
    } catch (err) {
      throwOnUniqueConflict(err, {
        email: 'A user account with this email address already exists.',
        username: 'This username is already taken.',
        employeeId: 'This person already has a user account.',
      });
    }
  }

  async remove(id: string): Promise<UserWithEmployee> {
    return this.prisma.user.delete({
      where: { id },
      include: userWithEmployeeInclude,
    });
  }

  async resetPassword(
    id: string,
    newPassword?: string,
  ): Promise<{
    success: true;
    credentialsEmailStatus: CredentialsEmailStatus;
    credentialsEmailReason?: string;
  }> {
    const generated = newPassword === undefined;
    const password = newPassword ?? this.generateTempPassword();
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        authSessions: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
      include: userWithEmployeeInclude,
    });

    const delivery = generated
      ? await this.deliverCredentials(user, password)
      : {
          status: 'skipped' as const,
          reason: 'A password was supplied by the caller; no email was sent.',
        };

    return {
      success: true,
      credentialsEmailStatus: delivery.status,
      credentialsEmailReason: delivery.reason,
    };
  }

  async resendCredentials(
    id: string,
  ): Promise<{
    credentialsEmailStatus: CredentialsEmailStatus;
    credentialsEmailReason?: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userWithEmployeeInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const temporaryPassword = this.generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        authSessions: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
    });

    const delivery = await this.deliverCredentials(user, temporaryPassword);
    return {
      credentialsEmailStatus: delivery.status,
      credentialsEmailReason: delivery.reason,
    };
  }

  private async deliverCredentials(
    user: UserWithEmployee,
    temporaryPassword: string,
  ): Promise<{ status: CredentialsEmailStatus; reason?: string }> {
    const email = user.email;
    if (!email) {
      this.logger.warn(
        `Account credentials email skipped for user ${user.id}: no email address on account.`,
      );
      return {
        status: 'skipped',
        reason: 'No email address is set on the account.',
      };
    }
    if (!this.mailService.isConfigured) {
      this.logger.warn(
        `Account credentials email skipped for ${email}: SMTP is not configured.`,
      );
      return {
        status: 'skipped',
        reason:
          'SMTP is not configured (MAIL_HOST/MAIL_FROM_ADDRESS are missing in api/.env).',
      };
    }

    const fullName =
      [user.employee?.firstName, user.employee?.middleName, user.employee?.lastName]
        .filter(Boolean)
        .join(' ') || user.username || email || user.id;

    try {
      await this.mailService.sendAccountCreated({
        to: email,
        email,
        fullName,
        temporaryPassword,
      });
      return { status: 'sent' };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send account credentials email to ${email}.`,
        err instanceof Error ? err.stack : String(err),
      );
      return { status: 'failed', reason };
    }
  }

  private generateTempPassword(): string {
    const len = 12;
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < len; i++) {
      out += charset[randomInt(charset.length)];
    }
    return out;
  }
}