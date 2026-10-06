import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { FilterReleasesDto } from './dto/filter-releases.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentReleaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReleaseDto, releasedById: string): Promise<unknown> {
    throw new BadRequestException('Release is no longer supported.');
  }

  async findAll(filter: FilterReleasesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, documentId, releasedById, releasedToId, dateFrom, dateTo, order } = filter;
    const where: Record<string, unknown> = {};
    if (documentId) where.documentId = documentId;
    if (releasedById) where.releasedById = releasedById;
    if (releasedToId) where.releasedToId = releasedToId;
    if (dateFrom || dateTo) {
      where.releasedAt = {};
      if (dateFrom) (where.releasedAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.releasedAt as Record<string, Date>).lte = new Date(dateTo);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentRelease.findMany({
        where,
        orderBy: { releasedAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentRelease.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentRelease.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateReleaseDto): Promise<unknown> {
    return this.prisma.documentRelease.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.documentRelease.delete({ where: { id } });
  }
}
