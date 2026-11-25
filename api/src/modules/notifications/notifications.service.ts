import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

export interface NotificationEvent {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdAt: Date;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

type PrismaNotification = Prisma.NotificationGetPayload<Record<string, never>>;

function toRow(n: PrismaNotification): NotificationRow {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link ?? null,
    read: n.read,
    readAt: n.readAt ?? null,
    createdAt: n.createdAt,
  };
}

@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<NotificationEvent>();
  readonly stream$ = this.events$.asObservable();

  constructor(private readonly prisma: PrismaService) {}

  publish(event: NotificationEvent): void {
    this.events$.next(event);
  }

  private async isNotificationAllowed(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const pref = await (this.prisma as any).userNotificationPreference.findUnique({ where: { userId } });
      if (!pref) return true;
      const map: Record<string, boolean> = {
        incoming_document: pref.incomingDocuments,
        receipt_acknowledged: pref.receiptAcknowledged,
        recipient_note: pref.recipientNotes,
        overdue: pref.overdueDocuments,
        archived: pref.archivedDocuments,
      };
      if (type in map) return !!map[type as string];
      return true;
    } catch {
      return true;
    }
  }

  async create(dto: CreateNotificationDto): Promise<NotificationRow | null> {
    const allowed = await this.isNotificationAllowed(dto.userId, dto.type);
    if (!allowed) return null as any;
    const notif = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
    this.publish({
      id: notif.id,
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link ?? undefined,
      createdAt: notif.createdAt,
    });
    return toRow(notif);
  }

  async findAll(
    userId: string,
    filter: FilterNotificationsDto,
  ): Promise<PaginatedResult<NotificationRow>> {
    const { page, pageSize, type, read, order } = filter;
    const where: Prisma.NotificationWhereInput = { userId };
    if (type) where.type = type;
    if (typeof read === 'boolean') where.read = read;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items: items.map(toRow), total, page, pageSize };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, dto: MarkReadDto): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: dto.ids }, userId },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  async remove(userId: string, id: string): Promise<{ success: boolean }> {
    const result = await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { success: result.count > 0 };
  }
}
