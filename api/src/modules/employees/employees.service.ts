import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeesDto } from './dto/filter-employees.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { throwOnUniqueConflict } from '../../common/utils/prisma-unique.util';

type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: {
    office: true;
    user: { select: { id: true; username: true; role: true; status: true } };
  };
}>;

const employeeInclude = {
  office: true,
  user: { select: { id: true, username: true, role: true, status: true } },
} satisfies Prisma.EmployeeInclude;

const SORTABLE_FIELDS = new Set(['firstName', 'lastName', 'employeeNo', 'createdAt']);

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeWithRelations> {
    const data: Prisma.EmployeeCreateInput = {
      employeeNo: dto.employeeNo,
      firstName: dto.firstName,
      lastName: dto.lastName,
      position: dto.position,
      email: dto.email,
      office: { connect: { id: dto.officeId } },
    };
    if (dto.middleName !== undefined) data.middleName = dto.middleName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.hiredAt) data.hiredAt = new Date(dto.hiredAt);

    try {
      return await this.prisma.employee.create({
        data,
        include: employeeInclude,
      });
    } catch (err) {
      throwOnUniqueConflict(err, {
        email: 'A person with this email address is already registered.',
        employeeNo: 'An employee with this number already exists.',
      });
    }
  }

  async findAll(filter: FilterEmployeesDto): Promise<PaginatedResult<EmployeeWithRelations>> {
    const { page, pageSize, search, officeId, isActive, position, sortBy, order } = filter;
    const where: Prisma.EmployeeWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (officeId) where.officeId = officeId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (position) where.position = { contains: position, mode: 'insensitive' };

    const orderField = sortBy && SORTABLE_FIELDS.has(sortBy) ? sortBy : 'lastName';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: { [orderField]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<EmployeeWithRelations> {
    return this.prisma.employee.findUniqueOrThrow({
      where: { id },
      include: employeeInclude,
    });
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeWithRelations> {
    const data: Prisma.EmployeeUpdateInput = {};
    if (dto.employeeNo !== undefined) data.employeeNo = dto.employeeNo;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.middleName !== undefined) data.middleName = dto.middleName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.officeId !== undefined) {
      data.office =
        dto.officeId === null
          ? { disconnect: true }
          : { connect: { id: dto.officeId } };
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.hiredAt) data.hiredAt = new Date(dto.hiredAt);

    try {
      return await this.prisma.employee.update({
        where: { id },
        data,
        include: employeeInclude,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new NotFoundException('Employee not found');
        }
        if (err.code === 'P2003') {
          throw new BadRequestException('The selected office does not exist.');
        }
      }
      throw err;
    }
  }

  async remove(id: string): Promise<EmployeeWithRelations> {
    return this.prisma.employee.delete({
      where: { id },
      include: employeeInclude,
    });
  }
}
