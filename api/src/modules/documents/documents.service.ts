import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Prisma, RecipientStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentsDto } from './dto/filter-documents.dto';
import { TransitionDocumentDto } from './dto/transition-document.dto';
import { ReceiveDocumentDto } from './dto/receive-document.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Workflow: REGISTERED -> RECEIVED -> ARCHIVED.
// No status is ever changed by a manual user transition:
//  - 'received' is set by the per-office receiving action.
//  - 'archived' is set by DocumentsAutoArchiveService after the retention window.
// The legacy 'approved' / 'rejected' / 'released' statuses are retained only so
// historical documents keep rendering; nothing can transition into them.
const ACTIVE_WORKFLOW_STATUSES: DocumentStatus[] = ['registered', 'received'];

export type DocumentTypeMeta = Prisma.DocumentTypeGetPayload<Record<string, never>>;

export type DocumentListItem = Prisma.DocumentGetPayload<{
  include: {
    type: true;
    recipients: { include: { office: { select: { id: true; name: true; code: true } } } };
    _count: { select: { reviews: true; releases: true; archives: true; attachments: true } };
  };
}>;

export type DocumentDetail = Prisma.DocumentGetPayload<{
  include: {
    type: true;
    attachments: true;
    reviews: true;
    releases: true;
    archives: true;
    history: true;
    recipients: { include: { office: { select: { id: true; name: true; code: true } } } };
  };
}>;

export interface DocumentPerson {
  id: string;
  fullName: string;
  email: string | null;
  position: string | null;
  officeId: string | null;
}

export interface DocumentDetailResponse extends DocumentDetail {
  encodedBy: DocumentPerson | null;
  receivedBy: DocumentPerson | null;
  approvedBy: DocumentPerson | null;
  releasedBy: DocumentPerson | null;
  currentHolder: DocumentPerson | null;
}

export type DocumentHistoryEntry = Prisma.DocumentHistoryGetPayload<Record<string, never>>;

export type DocumentTimelineEntry = Prisma.DocumentTrackingGetPayload<Record<string, never>>;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Fire-and-forget notification. Never blocks or fails the workflow.
   */
  private notify(
    userId: string | null | undefined,
    title: string,
    message: string,
  ): void {
    if (!userId) return;
    void this.notifications
      .create({
        userId,
        type: 'document',
        title,
        message,
        link: 'documents',
      })
      .catch(() => undefined);
  }

  /**
   * Send a document notification to every active user. Fire-and-forget:
   * never blocks or fails the workflow once the note has been saved.
   */
  private async notifyAllActiveUsers(
    title: string,
    message: string,
    link: string,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    for (const user of users) {
      void this.notifications
        .create({ userId: user.id, type: 'document', title, message, link })
        .catch(() => undefined);
    }
  }

  private async recipientNoteAuthorName(userId: string): Promise<string> {
    if (!userId) return 'Unknown';
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          select: { firstName: true, middleName: true, lastName: true },
        },
      },
    });
    if (!user) return 'Unknown';
    return (
      [user.employee?.firstName, user.employee?.middleName, user.employee?.lastName]
        .filter(Boolean)
        .join(' ') || user.username || user.email || user.id
    );
  }

  async create(dto: CreateDocumentDto, encodedById: string): Promise<unknown> {
    const encoder = await this.prisma.user.findUnique({
      where: { id: encodedById },
      include: { employee: { select: { officeId: true } } },
    });
    const authenticatedOfficeId = encoder?.employee?.officeId;
    if (!authenticatedOfficeId) {
      throw new BadRequestException('Authenticated user has no assigned office');
    }
    const trackingNumber = await this.generateTrackingNumber();

    const useManualOrigin = !dto.originatingOfficeId;
    const documentNumber =
      dto.documentNumber?.trim() ||
      (useManualOrigin
        ? await this.generateManualDocumentNumber()
        : await this.suggestDocumentNumber(dto.originatingOfficeId!));

    // "All offices" must be explicit. Omitting the flag defaults to a scoped
// distribution, so an unselected office can never become a recipient.
const destinationsAllOffices = dto.destinationsAllOffices === true;
    const recipientOfficeIds = (dto.recipientOfficeIds ?? []).filter((id) => !!id);

    // Validation: cannot target both "all offices" and specific offices.
    if (destinationsAllOffices && recipientOfficeIds.length > 0) {
      throw new BadRequestException(
        'Cannot specify recipient offices when the document is sent to all offices.',
      );
    }

    // A document must always have at least one destination.
    if (!destinationsAllOffices && recipientOfficeIds.length === 0) {
      throw new BadRequestException(
        'Select at least one recipient office, or explicitly send the document to all offices.',
      );
    }

    // Manual origin requires a text name.
    if (useManualOrigin && !dto.originatingOfficeName?.trim()) {
      throw new BadRequestException(
        'A manual originating office name is required when no office is selected.',
      );
    }

    if (recipientOfficeIds.length > 0) {
      const offices = await this.prisma.office.findMany({
        where: { id: { in: recipientOfficeIds } },
        select: { id: true },
      });
      if (offices.length !== recipientOfficeIds.length) {
        throw new BadRequestException('One or more recipient offices do not exist.');
      }
    }

    const documentType = await this.prisma.documentType.findUnique({
      where: { id: dto.typeId },
      select: { id: true },
    });
    if (!documentType) {
      throw new BadRequestException('The selected document type does not exist.');
    }

    // Materialize the recipient offices: "All Offices" creates a receiving
    // record for every active office so each office tracks its own status.
    const effectiveRecipientOfficeIds = await this.resolveRecipientOfficeIds(
      destinationsAllOffices,
      recipientOfficeIds,
    );

    // Postgres treats NULLs as distinct in a composite unique index, so a
    // document with no originating office gets NO database-level guarantee
    // that its number is unique. Enforce it here instead.
    if (!dto.originatingOfficeId) {
      const duplicate = await this.prisma.document.findFirst({
        where: { documentNumber, originatingOfficeId: null },
        select: { id: true },
      });
      if (duplicate) {
        throw await this.buildDocumentNumberConflict(documentNumber, null);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        const doc = await tx.document.create({
          data: {
            trackingNumber,
            documentNumber,
            title: dto.title,
            description: dto.description,
            typeId: dto.typeId,
            classification: dto.classification,
            priority: dto.priority ?? 'normal',
            source: dto.source,
            senderName: dto.senderName,
            tags: dto.tags ?? [],
            originatingOfficeId: dto.originatingOfficeId ?? null,
            originatingOfficeName: useManualOrigin ? dto.originatingOfficeName?.trim() : null,
            currentOfficeId: authenticatedOfficeId,
            currentHolderId: dto.currentHolderId ?? null,
            destinationsAllOffices,
            encodedById,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            recipients: effectiveRecipientOfficeIds.length
              ? { create: effectiveRecipientOfficeIds.map((officeId) => ({ officeId })) }
              : undefined,
          },
        });
        await tx.documentHistory.create({
          data: {
            documentId: doc.id,
            fromStatus: null,
            toStatus: 'registered',
            actorId: encodedById,
            remarks: 'Document registered',
          },
        });
        await tx.documentTracking.create({
          data: {
            documentId: doc.id,
            actorId: encodedById,
            event: 'document.registered',
            payload: {
              trackingNumber,
              documentNumber,
              classification: dto.classification,
              destinationsAllOffices,
              recipientOfficeIds: effectiveRecipientOfficeIds,
            } as Prisma.InputJsonValue,
          },
        });
        return doc;
      } catch (err: unknown) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw await this.buildDocumentNumberConflict(documentNumber);
        }
        throw err;
      }
    });
  }

  /**
   * Resolve the offices a document is destined for. When sent to all offices,
   * materialize one receiving record per ACTIVE office so each office tracks
   * its own receiving status independently.
   */
  private async resolveRecipientOfficeIds(
    destinationsAllOffices: boolean,
    recipientOfficeIds: string[],
  ): Promise<string[]> {
    if (destinationsAllOffices) {
      const offices = await this.prisma.office.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return offices.map((office) => office.id);
    }
    return recipientOfficeIds;
  }

  async findAll(
    filter: FilterDocumentsDto,
    actorId?: string,
  ): Promise<PaginatedResult<DocumentListItem>> {
    const {
      page,
      pageSize,
      search,
      status,
      statuses,
      typeId,
      classification,
      priority,
      source,
      originatingOfficeId,
      currentOfficeId,
      currentHolderId,
      encodedById,
      receivedById,
      recipientOfficeId,
      recipientStatus,
      dateFrom,
      dateTo,
      sortBy,
      order,
    } = filter;

    const where: Prisma.DocumentWhereInput = { deletedAt: null };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }
    if (status) where.status = status;
    if (statuses && statuses.length) where.status = { in: statuses };
    if (typeId) where.typeId = typeId;
    if (classification) where.classification = classification;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (originatingOfficeId) where.originatingOfficeId = originatingOfficeId;
    if (currentOfficeId) where.currentOfficeId = currentOfficeId;
    if (currentHolderId) where.currentHolderId = currentHolderId;
    if (encodedById) where.encodedById = encodedById;
    if (receivedById) where.receivedById = receivedById;
    if (recipientOfficeId) {
      where.recipients = {
        some: {
          officeId: recipientOfficeId,
          ...(recipientStatus ? { status: recipientStatus } : {}),
        },
      };
    }

    // Recipient-only access: a document officer may only ever list documents
    // addressed to their own office (or ones they registered themselves).
    const visibilityScope = await this.buildRecipientVisibilityScope(actorId);
    if (visibilityScope) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        visibilityScope,
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: {
          type: true,
          recipients: { include: { office: { select: { id: true, name: true, code: true } } } },
          _count: { select: { reviews: true, releases: true, archives: true, attachments: true } },
        },
        orderBy: { [sortBy ?? 'createdAt']: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, actorId?: string): Promise<DocumentDetailResponse> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        type: true,
        attachments: true,
        reviews: { orderBy: { createdAt: 'desc' } },
        releases: { orderBy: { releasedAt: 'desc' } },
        archives: { orderBy: { archivedAt: 'desc' } },
        history: { orderBy: { occurredAt: 'asc' } },
        recipients: { include: { office: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.deletedAt) throw new NotFoundException('Document not found');
    await this.assertRecipientVisibility(doc, actorId);
    const ids = Array.from(new Set([doc.encodedById, doc.receivedById, doc.approvedById, doc.releasedById, doc.currentHolderId].filter((value): value is string => !!value)));
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          include: {
            employee: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                position: true,
                officeId: true,
              },
            },
          },
        })
      : [];
    const people = new Map(users.map(user => [user.id, this.toDocumentPerson(user)]));
    return {
      ...doc,
      encodedBy: people.get(doc.encodedById) ?? null,
      receivedBy: doc.receivedById ? people.get(doc.receivedById) ?? null : null,
      approvedBy: doc.approvedById ? people.get(doc.approvedById) ?? null : null,
      releasedBy: doc.releasedById ? people.get(doc.releasedById) ?? null : null,
      currentHolder: doc.currentHolderId ? people.get(doc.currentHolderId) ?? null : null,
    };
  }

  private toDocumentPerson(user: Prisma.UserGetPayload<{
    include: { employee: { select: { firstName: true; middleName: true; lastName: true; position: true; officeId: true } } };
  }>): DocumentPerson {
    return {
      id: user.id,
      fullName: [user.employee?.firstName, user.employee?.middleName, user.employee?.lastName]
        .filter(Boolean)
        .join(' ') || user.username || user.email || user.id,
      email: user.email,
      position: user.employee?.position ?? null,
      officeId: user.employee?.officeId ?? null,
    };
  }

  /**
   * OFFICE_ADMIN may only act on documents their own office may act on:
   * the document is currently held by their office, OR their office has
   * already received the document (per-office receiving). SYSTEM_ADMIN is a
   * superuser and bypasses this check.
   */
  private async assertOfficeOwnership(
    actorId: string,
    doc: { id: string; currentOfficeId: string | null },
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    if (!actor) throw new NotFoundException('Actor not found');
    if (actor.role === Role.OFFICE_ADMIN) {
      const officeId = actor.employee?.officeId;
      if (!officeId) {
        throw new ForbiddenException(
          'You can only manage documents assigned to your own office',
        );
      }
      if (doc.currentOfficeId === officeId) return;
      const received = await this.prisma.documentRecipient.count({
        where: { documentId: doc.id, officeId, status: 'received' },
      });
      if (received === 0) {
        throw new ForbiddenException(
          'You can only manage documents assigned to your own office',
        );
      }
    }
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<unknown> {
    const { recipientOfficeIds, destinationsAllOffices, ...rest } = dto;

    const existing = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Document not found');

    if (
      destinationsAllOffices !== undefined &&
      recipientOfficeIds !== undefined &&
      destinationsAllOffices &&
      recipientOfficeIds.length > 0
    ) {
      throw new BadRequestException(
        'Cannot specify recipient offices when the document is sent to all offices.',
      );
    }

    if (recipientOfficeIds !== undefined && recipientOfficeIds.length > 0) {
      const offices = await this.prisma.office.findMany({
        where: { id: { in: recipientOfficeIds } },
        select: { id: true },
      });
      if (offices.length !== recipientOfficeIds.length) {
        throw new BadRequestException('One or more recipient offices do not exist.');
      }
    }

    const finalAllOffices =
      destinationsAllOffices !== undefined
        ? destinationsAllOffices
        : recipientOfficeIds !== undefined && recipientOfficeIds.length === 0;

    const nextRecipientIds =
      recipientOfficeIds !== undefined || destinationsAllOffices !== undefined
        ? await this.resolveRecipientOfficeIds(finalAllOffices, recipientOfficeIds ?? [])
        : null;

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id },
        data: {
          ...rest,
          ...(recipientOfficeIds !== undefined || destinationsAllOffices !== undefined
            ? { destinationsAllOffices: finalAllOffices }
            : {}),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });

      if (nextRecipientIds !== null) {
        if (nextRecipientIds.length === 0) {
          throw new BadRequestException(
            'Select at least one recipient office, or explicitly send the document to all offices.',
          );
        }
        // Replace the recipient set with the resolved (materialized) list.
        await tx.documentRecipient.deleteMany({ where: { documentId: id } });
        if (nextRecipientIds.length > 0) {
          await tx.documentRecipient.createMany({
            data: nextRecipientIds.map((officeId) => ({ documentId: id, officeId })),
          });
        }
      }

      return doc;
    }).then(() => this.findOne(id));
  }

  async remove(id: string, actorId: string): Promise<{ id: string; deleted: boolean }> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Document not found');

    // OFFICE_ADMIN may only delete documents their own office may act on
    // (held by their office or already received by their office).
    await this.assertOfficeOwnership(actorId, doc);

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
    });

    return { id, deleted: true };
  }

  /**
   * Soft-deletes every active document. Restricted to SYSTEM_ADMIN by the
   * controller. Related records (recipients, routing, reviews, releases,
   * trackings, archives, history, attachments) are left intact â€” they remain
   * attached to the hidden document, so no orphaned records are created.
   */
  async removeAll(actorId: string): Promise<{ deletedCount: number }> {
    const result = await this.prisma.document.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date(), deletedById: actorId },
    });
    return { deletedCount: result.count };
  }


  /**
   * Per-office receiving action. Only a user belonging to a designated
   * recipient office may receive the document for that office. Each office's
   * receiving status is tracked independently; the document itself is
   * auto-advanced to 'received' once every designated office has received it.
   */
  async receive(id: string, actorId: string, dto: ReceiveDocumentDto): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.deletedAt) throw new NotFoundException('Document not found');

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    if (!actor) throw new NotFoundException('Actor not found');

    const permittedRoles: Role[] = [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER];
    if (!permittedRoles.includes(actor.role)) {
      throw new ForbiddenException(
        'Your role is not permitted to receive documents',
      );
    }

    // Enforce the persisted permission (SYSTEM_ADMIN bypasses, matching the
    // superuser convention used across the module).
    if (actor.role !== Role.SYSTEM_ADMIN) {
      const granted = await this.prisma.rolePermission.count({
        where: { role: actor.role, permission: 'documents.receive' },
      });
      if (granted === 0) {
        throw new ForbiddenException(
          'Your role does not have permission to receive documents',
        );
      }
    }

    if (doc.encodedById === actorId) {
      throw new ForbiddenException(
        'The registrar cannot receive a document they registered. Another authorized user must receive it.',
      );
    }

    const officeId = actor.employee?.officeId;
    if (!officeId) {
      throw new BadRequestException('Authenticated user has no assigned office');
    }

    if (doc.status === 'archived') {
      throw new BadRequestException(
        'Cannot receive a document that has already been archived',
      );
    }

    const recipient = await this.prisma.documentRecipient.findUnique({
      where: { documentId_officeId: { documentId: id, officeId } },
    });
    if (!recipient) {
      throw new ForbiddenException(
        'Your office is not a designated recipient of this document',
      );
    }
    if (recipient.status === 'received') {
      throw new BadRequestException(
        'Your office has already received this document',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.documentRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'received',
          receivedById: actorId,
          receivedAt: now,
          remarks: dto.remarks?.trim() ? dto.remarks.trim() : null,
        },
        include: { office: { select: { id: true, name: true, code: true } } },
      });

      await tx.documentTracking.create({
        data: {
          documentId: id,
          actorId,
          event: 'recipient.received',
          payload: {
            officeId,
            remarks: dto.remarks ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      // Auto-advance the document once at least one recipient office has
      // received it. Per-recipient receiving continues independently after
      // this point â€” other offices can still mark themselves as received.
      let advanced = false;
      if (doc.status === 'registered') {
        await tx.document.update({
          where: { id },
          data: { status: 'received', receivedById: actorId, dateReceived: now },
        });
        await tx.documentHistory.create({
          data: {
            documentId: id,
            fromStatus: 'registered',
            toStatus: 'received',
            actorId,
            remarks: 'Document received by at least one recipient office',
          },
        });
        await tx.documentTracking.create({
          data: {
            documentId: id,
            actorId,
            event: 'status.transition',
            payload: {
              from: 'registered',
              to: 'received',
              automatic: true,
            } as Prisma.InputJsonValue,
          },
        });
        advanced = true;
      }

      return { recipient: updated, advanced, officeName: updated.office.name };
    });

    // Notifications (outside the transaction; never blocks the workflow).
    const title = `${doc.trackingNumber} Â· ${doc.title}`;
    this.notify(
      doc.encodedById,
      'Document received',
      `${title} was received by ${result.officeName}.`,
    );

    return {
      recipient: result.recipient,
      documentStatus: result.advanced ? 'received' : doc.status,
    };
  }

  async getHistory(id: string): Promise<DocumentHistoryEntry[]> {
    return this.prisma.documentHistory.findMany({
      where: { documentId: id },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async getTimeline(id: string): Promise<DocumentTimelineEntry[]> {
    return this.prisma.documentTracking.findMany({
      where: { documentId: id },
      orderBy: { occurredAt: 'asc' },
    });
  }

  /**
   * Note management authorization, per recipient status:
   *  - pending  -> only SYSTEM_ADMIN / OFFICE_ADMIN (existing rule)
   *  - received -> the receiving office itself, or any admin
   */
  private async assertCanManageNote(
    actorId: string,
    officeId: string,
    recipient: { status: RecipientStatus },
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    if (!actor) throw new NotFoundException('Actor not found');

    const isAdmin =
      actor.role === Role.SYSTEM_ADMIN || actor.role === Role.OFFICE_ADMIN;
    if (recipient.status === 'received') {
      if (isAdmin || actor.employee?.officeId === officeId) return;
      throw new ForbiddenException(
        'Only the receiving office or an admin can manage notes for this office',
      );
    }
    if (isAdmin) return;
    throw new ForbiddenException(
      'Only System Admin and Office Admin can manage pending office notes',
    );
  }

  private async getRecipientForNote(
    documentId: string,
    officeId: string,
  ): Promise<{
    id: string;
    status: RecipientStatus;
    note: string | null;
    receivedById: string | null;
  }> {
    const recipient = await this.prisma.documentRecipient.findUnique({
      where: { documentId_officeId: { documentId, officeId } },
      select: { id: true, status: true, note: true, receivedById: true },
    });
    if (!recipient) {
      throw new NotFoundException(
        'This office is not a designated recipient of the document',
      );
    }
    return recipient;
  }

  async setRecipientNote(
    documentId: string,
    officeId: string,
    actorId: string,
    note: string,
  ): Promise<unknown> {
    const recipient = await this.getRecipientForNote(documentId, officeId);
    await this.assertCanManageNote(actorId, officeId, recipient);

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { trackingNumber: true, title: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // For received offices, attribute the note to the user who received the
    // document rather than the admin/office member who typed it.
    const noteAuthorId =
      recipient.status === 'received'
        ? recipient.receivedById ?? actorId
        : actorId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.documentRecipient.update({
        where: { id: recipient.id },
        data: { note, noteById: noteAuthorId, noteAt: new Date() },
        include: { office: { select: { id: true, name: true, code: true } } },
      });
      await tx.documentTracking.create({
        data: {
          documentId,
          actorId,
          event: recipient.note ? 'recipient.note.updated' : 'recipient.note.added',
          payload: { officeId, note } as Prisma.InputJsonValue,
        },
      });
      return row;
    });

    // Notifications only after the note was successfully saved. Never blocks
    // the workflow, and is enforced server-side regardless of the client.
    const authorName = await this.recipientNoteAuthorName(noteAuthorId);
    const preview =
      note.length > 140 ? `${note.slice(0, 137).trimEnd()}â€¦` : note;
    const message =
      `${doc.trackingNumber} Â· ${doc.title} â€” note for ${updated.office.name}` +
      ` (${updated.office.code}) by ${authorName}: "${preview}"`;
    void this.notifyAllActiveUsers(
      recipient.note ? 'Recipient note updated' : 'New recipient note',
      message,
      `documents/${documentId}`,
    );
    return updated;
  }

  async deleteRecipientNote(
    documentId: string,
    officeId: string,
    actorId: string,
  ): Promise<void> {
    const recipient = await this.getRecipientForNote(documentId, officeId);
    await this.assertCanManageNote(actorId, officeId, recipient);

    await this.prisma.$transaction(async (tx) => {
      await tx.documentRecipient.update({
        where: { id: recipient.id },
        data: { note: null, noteById: null, noteAt: null },
      });
      await tx.documentTracking.create({
        data: {
          documentId,
          actorId,
          event: 'recipient.note.deleted',
          payload: { officeId } as Prisma.InputJsonValue,
        },
      });
    });
  }

  private async findExistingDocumentByNumber(
    documentNumber: string,
    originatingOfficeId?: string | null,
  ): Promise<{
    id: string;
    trackingNumber: string;
    originatingOfficeCode: string | null;
    originatingOfficeName: string | null;
  } | null> {
    const existing = await this.prisma.document.findFirst({
      where: { documentNumber, originatingOfficeId: originatingOfficeId ?? null },
      select: {
        id: true,
        trackingNumber: true,
        originatingOfficeId: true,
        originatingOfficeName: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!existing) return null;

    let originatingOfficeCode: string | null = null;
    if (existing.originatingOfficeId) {
      const office = await this.prisma.office.findUnique({
        where: { id: existing.originatingOfficeId },
        select: { code: true },
      });
      originatingOfficeCode = office?.code ?? null;
    }

    return {
      id: existing.id,
      trackingNumber: existing.trackingNumber,
      originatingOfficeCode,
      originatingOfficeName: existing.originatingOfficeName,
    };
  }

  private async buildDocumentNumberConflict(
    documentNumber: string,
    originatingOfficeId?: string | null,
  ): Promise<ConflictException> {
    const existing = await this.findExistingDocumentByNumber(
      documentNumber,
      originatingOfficeId,
    );
    if (!existing) {
      return new ConflictException(
        `Document number '${documentNumber}' is already used.`,
      );
    }
    const officeLabel =
      existing.originatingOfficeCode ?? existing.originatingOfficeName;
    const message = officeLabel
      ? `Document number '${documentNumber}' is already used by ${existing.trackingNumber} in originating office ${officeLabel}.`
      : `Document number '${documentNumber}' is already used by ${existing.trackingNumber}.`;
    return new ConflictException({
      message,
      existingId: existing.id,
      existingTrackingNumber: existing.trackingNumber,
      originatingOfficeCode: existing.originatingOfficeCode,
      originatingOfficeName: existing.originatingOfficeName,
    });
  }

  async checkDocumentNumberAvailability(
    documentNumber: string,
    originatingOfficeId?: string | null,
  ): Promise<{
    available: boolean;
    existing: {
      id: string;
      trackingNumber: string;
      originatingOfficeCode: string | null;
      originatingOfficeName: string | null;
    } | null;
  }> {
    const existing = await this.findExistingDocumentByNumber(
      documentNumber,
      originatingOfficeId,
    );
    return existing
      ? { available: false, existing }
      : { available: true, existing: null };
  }

  async suggestDocumentNumber(officeId: string): Promise<string> {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) {
      throw new NotFoundException(`Office ${officeId} not found`);
    }
    const year = new Date().getFullYear();
    const prefix = `${office.code}-${year}-`;
    // Soft-deleted documents are included on purpose: the unique index has no
    // `WHERE deletedAt IS NULL`, so their numbers stay reserved and the
    // suggestion must step past them instead of proposing a taken value.
    const last = await this.prisma.document.findFirst({
      where: {
        originatingOfficeId: officeId,
        documentNumber: { startsWith: prefix },
      },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });
    let nextSeq = 1;
    if (last?.documentNumber) {
      const tail = last.documentNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  async getDocumentNumberSuggestion(officeId: string): Promise<{ suggestion: string }> {
    const suggestion = await this.suggestDocumentNumber(officeId);
    return { suggestion };
  }

  private async generateTrackingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DMS-${year}-`;
    const last = await this.prisma.document.findFirst({
      where: { trackingNumber: { startsWith: prefix }, deletedAt: null },
      orderBy: { trackingNumber: 'desc' },
      select: { trackingNumber: true },
    });
    let nextSeq = 1;
    if (last?.trackingNumber) {
      const tail = last.trackingNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Build a `where` clause restricting a list query to documents the actor's
   * office may see. Returns `null` for SYSTEM_ADMIN and for the encoder's own
   * broad list, where no restriction applies.
   */
  private async buildRecipientVisibilityScope(
    actorId?: string,
  ): Promise<Prisma.DocumentWhereInput | null> {
    if (!actorId) return null;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        role: true,
        employee: { select: { officeId: true } },
      },
    });
    if (!actor) return null;
    if (actor.role === Role.SYSTEM_ADMIN || actor.role === Role.DOCUMENT_ENCODER) {
      return null;
    }

    const officeId = actor.employee?.officeId;
    if (!officeId) {
      // No office assigned: fall back to documents the person created.
      return { encodedById: actorId };
    }

    return {
      OR: [
        { encodedById: actorId },
        { recipients: { some: { officeId } } },
      ],
    };
  }

  /**
   * Recipient-only visibility.
   *
   * A document is visible to an office only when that office was selected
   * during registration, i.e. it has a materialized `DocumentRecipient` row.
   * The encoder who registered it keeps access, and SYSTEM_ADMIN can always
   * inspect anything.
   */
  private async assertRecipientVisibility(
    doc: {
      id: string;
      encodedById: string;
      recipients: { officeId: string }[];
    },
    actorId?: string,
  ): Promise<void> {
    if (!actorId) return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        role: true,
        employee: { select: { officeId: true } },
      },
    });
    if (!actor) return;
    if (actor.role === Role.SYSTEM_ADMIN) return;
    if (doc.encodedById === actorId) return;

    const officeId = actor.employee?.officeId;
    const isRecipient = officeId
      ? doc.recipients.some((r) => r.officeId === officeId)
      : false;

    if (!isRecipient) {
      throw new NotFoundException('Document not found');
    }
  }

  /**
   * Generate a globally unique document number for manual-origin documents
   * (no originating office selected). Uses a dedicated prefix so it never
   * collides with office-prefixed numbers.
   */
  private async generateManualDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MAN-${year}-`;
    // See suggestDocumentNumber: soft-deleted rows still reserve their number.
    const last = await this.prisma.document.findFirst({
      where: { documentNumber: { startsWith: prefix } },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });
    let nextSeq = 1;
    if (last?.documentNumber) {
      const tail = last.documentNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }
}
