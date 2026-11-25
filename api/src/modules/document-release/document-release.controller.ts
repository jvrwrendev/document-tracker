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
import { DocumentReleaseService } from './document-release.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { FilterReleasesDto } from './dto/filter-releases.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-release')
export class DocumentReleaseController {
  constructor(private readonly releaseService: DocumentReleaseService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('documents.edit')
  @Audit('release.create', 'release', 'DocumentRelease')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateReleaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.releaseService.create(dto, user.id);
  }

  @Permissions('documents.view')
  @Get()
  findAll(@Query() filter: FilterReleasesDto) {
    return this.releaseService.findAll(filter);
  }

  @Permissions('documents.view')
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.releaseService.findOne(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('documents.edit')
  @Patch(':id')
  @Audit('release.update', 'release', 'DocumentRelease')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReleaseDto,
  ) {
    return this.releaseService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Permissions('documents.edit')
  @Audit('release.delete', 'release', 'DocumentRelease')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.releaseService.remove(id);
  }
}
