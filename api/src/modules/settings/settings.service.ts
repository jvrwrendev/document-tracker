import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

type PublicSystemSettings = Omit<
  Prisma.SystemSettingGetPayload<Record<string, never>>,
  'smtpPass'
> & { hasSmtpPassword: boolean };

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly backupDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.backupDir =
      this.config.get<string>('BACKUP_DIR') ??
      path.join(process.cwd(), 'storage', 'backups');
  }

  async getOrCreate() {
    return this.prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  sanitize(settings: Prisma.SystemSettingGetPayload<Record<string, never>>): PublicSystemSettings {
    const { smtpPass, ...rest } = settings;
    return { ...rest, hasSmtpPassword: !!smtpPass };
  }

  async getPublicSettings() {
    return this.sanitize(await this.getOrCreate());
  }

  async updateSettings(dto: UpdateSystemSettingsDto, actorId: string) {
    const before = await this.getOrCreate();
    const data: Prisma.SystemSettingUpdateInput = {};

    const assign = <K extends keyof UpdateSystemSettingsDto & keyof Prisma.SystemSettingUpdateInput>(
      key: K,
    ) => {
      if (dto[key] !== undefined) (data as any)[key] = dto[key];
    };

    [
      'systemName','organizationName','organizationLogoUrl','contactEmail','contactPhone','contactAddress',
      'language','dateFormat','timezone','trackingPrefix','trackingYearFormat','trackingNumberPadding',
      'defaultDocumentPriority','maxAttachmentSizeMb','allowedAttachmentTypes','documentRegistrationPrefs',
      'autoArchiveEnabled','autoArchiveDays','retentionPolicyDays','smtpHost','smtpPort','smtpSecure',
      'smtpUser','smtpFromEmail','smtpFromName','emailNotificationsEnabled','passwordMinLength',
      'passwordRequireUppercase','passwordRequireLowercase','passwordRequireNumber','passwordRequireSymbol',
      'sessionTimeoutMinutes','loginAttemptLimit','loginLockoutMinutes',
    ].forEach(k => assign(k as any));

    if (dto.smtpPass !== undefined) {
      // Empty string means keep unchanged? Better: null clears, string sets. Ignore empty.
      if (dto.smtpPass === null || dto.smtpPass === '') {
        data.smtpPass = null;
      } else {
        data.smtpPass = dto.smtpPass;
      }
    }

    if (dto.allowedAttachmentTypes) {
      data.allowedAttachmentTypes = dto.allowedAttachmentTypes
        .map(t => t.toLowerCase().replace(/^\./, '').trim())
        .filter(Boolean);
    }

    data.updatedById = actorId;

    const after = await this.prisma.systemSetting.update({ where: { id: 'default' }, data });
    await this.auditSettingsChange(before, after, actorId);
    return this.sanitize(after);
  }

  private async auditSettingsChange(
    before: Prisma.SystemSettingGetPayload<Record<string, never>>,
    after: Prisma.SystemSettingGetPayload<Record<string, never>>,
    actorId: string,
  ) {
    const keys = Object.keys(after).filter(
      k => !['updatedAt', 'createdAt', 'updatedById', 'smtpPass'].includes(k),
    );
    const changes: Array<{ setting: string; previous: unknown; updated: unknown }> = [];
    for (const key of keys) {
      const prev = (before as any)[key];
      const next = (after as any)[key];
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        changes.push({ setting: key, previous: prev, updated: next });
      }
    }
    if (before.smtpPass !== after.smtpPass) {
      changes.push({
        setting: 'smtpPass',
        previous: before.smtpPass ? '[configured]' : null,
        updated: after.smtpPass ? '[configured]' : null,
      });
    }
    if (changes.length === 0) return;
    await this.prisma.auditLog.createMany({
      data: changes.map(c => ({
        actorId,
        action: 'settings.update',
        module: 'settings',
        description: `Updated setting: ${c.setting}`,
        targetId: 'default',
        targetType: 'SystemSetting',
        metadata: c as any,
      })),
    });
  }

  async getNotificationPreferences(userId: string) {
    return this.prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const existing = await this.getNotificationPreferences(userId);
    const data: Prisma.UserNotificationPreferenceUpdateInput = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) (data as any)[k] = v;
    }
    return this.prisma.userNotificationPreference.update({ where: { userId: existing.userId }, data });
  }

  async testEmail(actorId: string, to: string) {
    const settings = await this.getOrCreate();
    await this.mail.sendTestWithSettings(to, settings);
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'settings.email_test',
        module: 'settings',
        description: `Sent test email to ${to}`,
        targetId: 'default',
        targetType: 'SystemSetting',
      },
    });
    return { ok: true };
  }

  async getHealth() {
    const started = Date.now();
    let dbStatus: 'healthy' | 'unavailable' = 'unavailable';
    let dbSize: string | null = null;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'healthy';
      const sizeRows = await this.prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      dbSize = sizeRows[0]?.size ?? null;
    } catch {
      dbStatus = 'unavailable';
    }

    const apiResponseMs = Date.now() - started;
    let activeSessions: number | null = null;
    try {
      activeSessions = await this.prisma.authSession.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      });
    } catch {
      activeSessions = null;
    }

    let lastBackup: { filename: string; createdAt: Date; status: string } | null = null;
    try {
      const b = await this.prisma.backupRecord.findFirst({ orderBy: { createdAt: 'desc' } });
      if (b) lastBackup = { filename: b.filename, createdAt: b.createdAt, status: b.status };
    } catch {
      lastBackup = null;
    }

    return {
      database: { status: dbStatus, size: dbSize },
      api: { status: 'healthy' as const, responseMs: apiResponseMs },
      activeSessions,
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        nodeVersion: process.version,
        platform: os.platform(),
      },
      lastBackup,
    };
  }

  private getDatabaseUrl(): string {
    const url = this.config.get<string>('DATABASE_URL');
    if (!url) throw new BadRequestException('DATABASE_URL is not configured.');
    return url;
  }

  async listBackups() {
    return this.prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async createBackup(actorId: string, notes?: string) {
    await fs.mkdir(this.backupDir, { recursive: true });
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const filePath = path.join(this.backupDir, filename);
    const databaseUrl = this.getDatabaseUrl();

    await this.runCommand('pg_dump', [databaseUrl, '-f', filePath]);
    const stat = await fs.stat(filePath);
    const record = await this.prisma.backupRecord.create({
      data: { filename, path: filePath, sizeBytes: stat.size, status: 'completed', notes, createdById: actorId },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'backup.create',
        module: 'settings',
        description: `Created backup ${filename}`,
        targetId: record.id,
        targetType: 'BackupRecord',
        metadata: { filename, sizeBytes: stat.size },
      },
    });
    return record;
  }

  async getBackupFile(id: string) {
    const record = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Backup not found');
    await fs.access(record.path);
    return record;
  }

  async restoreBackup(id: string, actorId: string, confirmation: string) {
    if (confirmation !== 'RESTORE') {
      throw new BadRequestException('Confirmation text must be RESTORE.');
    }
    const record = await this.getBackupFile(id);
    const databaseUrl = this.getDatabaseUrl();
    await this.runCommand('psql', [databaseUrl, '-f', record.path]);
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'backup.restore',
        module: 'settings',
        description: `Restored backup ${record.filename}`,
        targetId: record.id,
        targetType: 'BackupRecord',
        metadata: { filename: record.filename },
      },
    });
    return { ok: true };
  }

  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', d => { stderr += String(d); });
      child.on('error', err => reject(new BadRequestException(`${command} failed: ${err.message}`)));
      child.on('close', code => {
        if (code === 0) resolve();
        else reject(new BadRequestException(`${command} exited with code ${code}. ${stderr.slice(0, 500)}`));
      });
    });
  }
}