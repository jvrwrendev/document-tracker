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
import { DocumentArchiveService } from './document-archive.service';
import { CreateArchiveDto } from './dto/create-archive.dto';
import { UpdateArchiveDto } from './dto/update-archive.dto';
import { FilterArchivesDto } from './dto/filter-archives.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-archive')
export class DocumentArchiveController {
  constructor(private readonly archiveService: DocumentArchiveService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('archive.view')
  @Audit('archive.create', 'archive', 'DocumentArchive')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateArchiveDto, @CurrentUser() user: AuthenticatedUser) {
    return this.archiveService.create(dto, user.id);
  }

  @Permissions('archive.view')
  @Get()
  findAll(@Query() filter: FilterArchivesDto) {
    return this.archiveService.findAll(filter);
  }

  @Permissions('archive.view')
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.archiveService.findOne(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('archive.view')
  @Patch(':id')
  @Audit('archive.update', 'archive', 'DocumentArchive')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateArchiveDto,
  ) {
    return this.archiveService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Permissions('archive.view')
  @Delete(':id')
  @Audit('archive.delete', 'archive', 'DocumentArchive')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.archiveService.remove(id);
  }
}
