import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Automatic archiving.
 *
 * Workflow: REGISTERED -> RECEIVED -> ARCHIVED. Archiving is never a manual
 * user action; this job performs it 7 days after the document is registered.
 *
 * - Runs entirely on the backend, so it does not depend on a user opening the
 *   Documents page.
 * - Only documents in an active workflow status (registered / received) are
 *   eligible, so already-archived documents are never reprocessed.
 * - Metadata, recipients, attachments, and receiving history are preserved:
 *   only `status` changes plus history/tracking audit entries are written.
 */
@Injectable()
export class DocumentsAutoArchiveService {
  private readonly logger = new Logger(DocumentsAutoArchiveService.name);

  /** Documents become eligible for archiving 7 days after registration. */
  static readonly ARCHIVE_AFTER_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Archive every document whose 7-day retention window has elapsed.
   * Exposed for manual invocation (tests, admin tooling) without the cron.
   */
  async runArchiveSweep(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS);

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
      const didArchive = await this.archiveDocument(doc.id);
      if (didArchive) archived += 1;
    }

    this.logger.log(
      `Automatically archived ${archived} document(s) older than ${DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS} days.`,
    );
    return archived;
  }

  private async archiveDocument(documentId: string): Promise<boolean> {
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
          remarks: `Automatically archived after ${DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS} days`,
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
            retentionDays: DocumentsAutoArchiveService.ARCHIVE_AFTER_DAYS,
          } as Prisma.InputJsonValue,
        },
      });

      return true;
    });
  }
}