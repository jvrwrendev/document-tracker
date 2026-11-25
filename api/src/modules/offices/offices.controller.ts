import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { OfficesService } from './offices.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { FilterOfficesDto } from './dto/filter-offices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ROLES } from '../../common/constants/roles.constants';

@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('offices')
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('offices.create')
  @Audit('office.create', 'offices', 'Office')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOfficeDto) {
    return this.officesService.create(dto);
  }

  @SkipThrottle()
  @Permissions('offices.view')
  @Get()
  findAll(@Query() filter: FilterOfficesDto) {
    return this.officesService.findAll(filter);
  }

  @SkipThrottle()
  @Permissions('offices.view')
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.officesService.findOne(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('offices.edit')
  @Audit('office.update', 'offices', 'Office')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOfficeDto,
  ) {
    return this.officesService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Permissions('offices.delete')
  @Audit('office.delete', 'offices', 'Office')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.officesService.remove(id);
  }
}
