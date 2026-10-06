import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchiveDto } from './dto/create-archive.dto';
import { UpdateArchiveDto } from './dto/update-archive.dto';
import { FilterArchivesDto } from './dto/filter-archives.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentArchiveService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArchiveDto, archivedById: string): Promise<unknown> {
    const doc = await this.prisma.document.findFirst({ where: { id: dto.documentId, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    throw new BadRequestException('Manual archiving is not supported. Documents are archived automatically after 7 days.');
  }

  async findAll(filter: FilterArchivesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, documentId, archivedById, dateFrom, dateTo, order } = filter;
    const where: Record<string, unknown> = {};
    if (documentId) where.documentId = documentId;
    if (archivedById) where.archivedById = archivedById;
    if (dateFrom || dateTo) {
      where.archivedAt = {};
      if (dateFrom) (where.archivedAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.archivedAt as Record<string, Date>).lte = new Date(dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentArchive.findMany({
        where,
        orderBy: { archivedAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentArchive.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentArchive.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateArchiveDto): Promise<unknown> {
    return this.prisma.documentArchive.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.documentArchive.delete({ where: { id } });
  }
}
