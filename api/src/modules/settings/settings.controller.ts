import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'node:fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { SettingsService } from './settings.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.view')
  @Roles(ROLES.SYSTEM_ADMIN)
  getSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Patch()
  @Permissions('settings.edit')
  @Roles(ROLES.SYSTEM_ADMIN)
  updateSettings(@Body() dto: UpdateSystemSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.updateSettings(dto, user.id);
  }

  @Get('health')
  @Permissions('settings.view')
  @Roles(ROLES.SYSTEM_ADMIN)
  getHealth() {
    return this.settingsService.getHealth();
  }

  @Get('notification-preferences')
  getNotificationPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getNotificationPreferences(user.id);
  }

  @Patch('notification-preferences')
  updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateNotificationPreferences(user.id, dto);
  }

  @Post('email/test')
  @Permissions('settings.edit')
  @Roles(ROLES.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  testEmail(@Body() body: { to: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.testEmail(user.id, body.to);
  }

  @Get('backups')
  @Roles(ROLES.SYSTEM_ADMIN)
  listBackups() {
    return this.settingsService.listBackups();
  }

  @Post('backups')
  @Roles(ROLES.SYSTEM_ADMIN)
  createBackup(@Body() body: { notes?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.createBackup(user.id, body?.notes);
  }

  @Get('backups/:id/download')
  @Roles(ROLES.SYSTEM_ADMIN)
  async downloadBackup(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const record = await this.settingsService.getBackupFile(id);
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
    createReadStream(record.path).pipe(res);
  }

  @Post('backups/:id/restore')
  @Roles(ROLES.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  restoreBackup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { confirmation: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.restoreBackup(id, user.id, body?.confirmation ?? '');
  }
}