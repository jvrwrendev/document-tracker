import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Office } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { throwOnUniqueConflict } from '../../common/utils/prisma-unique.util';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { FilterOfficesDto } from './dto/filter-offices.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

type OfficeWithCount = Prisma.OfficeGetPayload<{
  include: { _count: { select: { employees: true } } };
}>;

type OfficeListItem = Prisma.OfficeGetPayload<{
  include: {
    _count: { select: { employees: true } };
  };
}>;

type OfficeDetail = Prisma.OfficeGetPayload<{
  include: {
    employees: { take: 50 };
    _count: { select: { employees: true } };
  };
}>;

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfficeDto): Promise<OfficeWithCount> {
    try {
      return await this.prisma.office.create({
        data: dto,
        include: { _count: { select: { employees: true } } },
      });
    } catch (err) {
      throwOnUniqueConflict(err, {
        code: 'An office with this code already exists.',
      });
    }
  }

  async findAll(filter: FilterOfficesDto): Promise<PaginatedResult<OfficeListItem>> {
    const { page, pageSize, search: term, type, isActive, order } = filter;
    const where: Prisma.OfficeWhereInput = {};
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.office.findMany({
        where,
        include: {
          _count: { select: { employees: true } },
        },
        orderBy: { name: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.office.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<OfficeDetail> {
    return this.prisma.office.findUniqueOrThrow({
      where: { id },
      include: {
        employees: { take: 50 },
        _count: { select: { employees: true } },
      },
    });
  }

  async update(id: string, dto: UpdateOfficeDto): Promise<OfficeWithCount> {
    try {
      return await this.prisma.office.update({
        where: { id },
        data: dto,
        include: { _count: { select: { employees: true } } },
      });
    } catch (err) {
      throwOnUniqueConflict(err, {
        code: 'An office with this code already exists.',
      });
    }
  }

  async remove(id: string): Promise<Office> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const office = await tx.office.findUnique({ where: { id } });
        if (!office) {
          throw new NotFoundException('Office not found');
        }

        // Preserve the destination identity before the FK is set to null.
        await tx.documentRecipient.updateMany({
          where: { officeId: id },
          data: { officeName: office.name, officeCode: office.code },
        });

        return tx.office.delete({ where: { id } });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new NotFoundException('Office not found');
        }
        if (err.code === 'P2003') {
          throw new ConflictException({
            message:
              'This office cannot be deleted because it is still referenced by other records.',
            code: 'OFFICE_DELETE_CONFLICT',
          });
        }
      }
      throw err;
    }
  }
}