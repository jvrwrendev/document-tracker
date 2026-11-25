import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions('roles.view')
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Permissions('roles.view')
  @Get('catalog')
  getCatalog() {
    return this.rolesService.getCatalog();
  }

  @Permissions('roles.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Permissions('roles.view')
  @Get(':id/users')
  getRoleUsers(@Param('id') id: string) {
    return this.rolesService.getRoleUsers(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Permissions('permissions.assign')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async setPermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const updatedPermissions = await this.rolesService.setPermissions(
      id,
      permissions ?? [],
      { id: user.id, role: user.role },
    );
    return { permissions: updatedPermissions };
  }
}
