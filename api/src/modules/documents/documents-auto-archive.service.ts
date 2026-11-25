import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Automatic archiving.
 *
 * Workflow: REGISTERED -> RECEIVED -> ARCHIVED. Archiving is never a manual
 * user action; this job performs it after the configured retention window.
 */
@Injectable()
export class DocumentsAutoArchiveService {
  private readonly logger = new Logger(DocumentsAutoArchiveService.name);
  static readonly ARCHIVE_AFTER_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {}

  private async getArchiveConfig() {
    try {
      const settings = await (this.prisma as any).systemSetting.findUnique({ where: { id: 'default' } });
      return {
        enabled: settings?.autoArchiveEnabled ?? true,
        days: Math.max(1, Number(settings?.autoArchiveDays ?? DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS)),
      };
    } catch {
      return { enabled: true, days: DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS };
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async archiveEligibleDocuments(): Promise<number> {
    try {
      return await this.runArchiveSweep();
    } catch (error) {
      this.logger.error(
        'Automatic archiving sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  async runArchiveSweep(now: Date = new Date()): Promise<number> {
    const config = await this.getArchiveConfig();
    if (!config.enabled) return 0;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - config.days);

    // Explicitly exclude `archived` so archived documents are never
    // reprocessed, and only consider active workflow statuses.
    const eligible = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        status: { in: ['registered', 'received'] },
        createdAt: { lte: cutoff },
      },
      select: {
        id: true,
        trackingNumber: true,
        title: true,
        status: true,
        encodedById: true,
        createdAt: true,
      },
    });

    if (eligible.length === 0) return 0;

    let archived = 0;
    for (const doc of eligible) {
      const didArchive = await this.archiveDocument(doc.id, config.days);
      if (didArchive) archived += 1;
    }

    this.logger.log(
      `Automatically archived ${archived} document(s) older than ${config.days} day(s).`,
    );
    return archived;
  }

  private async archiveDocument(documentId: string, retentionDays = DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction so a concurrent sweep (or an
      // already-archived document) can never produce a duplicate archive.
      const current = await tx.document.findUnique({
        where: { id: documentId },
        select: { id: true, status: true, deletedAt: true, encodedById: true, trackingNumber: true },
      });
      if (!current || current.deletedAt) return false;
      if (current.status !== 'registered' && current.status !== 'received') return false;

      const fromStatus = current.status;
      const archivedAt = new Date();

      // Only `status` is mutated: metadata, recipients, attachments, and the
      // receiving history all remain untouched.
      await tx.document.update({
        where: { id: documentId },
        data: { status: 'archived' },
      });

      await tx.documentHistory.create({
        data: {
          documentId,
          fromStatus,
          toStatus: 'archived',
          actorId: null,
          remarks: `Automatically archived after ${retentionDays} day(s)`,
        },
      });

      await tx.documentTracking.create({
        data: {
          documentId,
          // DocumentTracking.actorId is required, so the system action is
          // attributed to the encoder that registered the document.
          actorId: current.encodedById,
          event: 'document.auto_archived',
          payload: {
            from: fromStatus,
            to: 'archived',
            automatic: true,
            archivedAt: archivedAt.toISOString(),
            retentionDays,
          } as Prisma.InputJsonValue,
        },
      });

      return true;
    });
  }
}