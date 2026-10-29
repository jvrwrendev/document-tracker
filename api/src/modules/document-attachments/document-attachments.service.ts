import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from './local-storage.service';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

export interface UploadedFileStub {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface DownloadInfo {
  absolutePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}



@Injectable()
export class DocumentAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  /**
   * Saves the uploaded file to disk and creates the DB row in one step.
   */
  async upload(
    documentId: string,
    file: UploadedFileStub,
    uploadedById: string,
  ): Promise<unknown> {
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    const storageKey = this.storage.buildStorageKey(documentId, file.originalname);
    await this.storage.save(file.buffer, storageKey);

    return this.prisma.documentAttachment.create({
      data: {
        documentId,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        storageKey,
        uploadedById,
      },
    });
  }

  async findAll(documentId: string): Promise<unknown> {
    return this.prisma.documentAttachment.findMany({
      where: { documentId, status: 'uploaded' },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findByDocumentFilter(documentId?: string): Promise<unknown> {
    if (!documentId) return [];
    return this.findAll(documentId);
  }

    async getDownloadInfo(id: string): Promise<DownloadInfo> {
    const att = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!att || att.status !== 'uploaded') throw new NotFoundException('Attachment not found');
    const absolutePath = this.storage.getAbsolutePath(att.storageKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File not found on server');
    }
    return {
      absolutePath,
      fileName: att.fileName,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
    };
  }

  async update(id: string, dto: UpdateAttachmentDto): Promise<unknown> {
    return this.prisma.documentAttachment.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<{ success: true }> {
    const att = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found');
    await this.storage.remove(att.storageKey);
    await this.prisma.documentAttachment.update({
      where: { id },
      data: { status: 'deleted' },
    });
    return { success: true };
  }
}


