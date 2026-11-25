import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSystemSettingsDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) systemName?: string;
  @IsOptional() @IsString() @MaxLength(120) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(500) organizationLogoUrl?: string | null;
  @IsOptional() @IsEmail() @MaxLength(160) contactEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(60) contactPhone?: string | null;
  @IsOptional() @IsString() @MaxLength(300) contactAddress?: string | null;
  @IsOptional() @IsString() @IsIn(['en', 'fil']) language?: string;
  @IsOptional() @IsString() @IsIn(['MMM DD, YYYY', 'DD MMM YYYY', 'YYYY-MM-DD']) dateFormat?: string;
  @IsOptional() @IsString() @MaxLength(80) timezone?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) trackingPrefix?: string;
  @IsOptional() @IsString() @IsIn(['YYYY', 'YY']) trackingYearFormat?: string;
  @IsOptional() @IsInt() @Min(3) @Max(8) trackingNumberPadding?: number;
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent']) defaultDocumentPriority?: 'low' | 'normal' | 'high' | 'urgent';
  @IsOptional() @IsInt() @Min(1) @Max(100) maxAttachmentSizeMb?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) allowedAttachmentTypes?: string[];
  @IsOptional() documentRegistrationPrefs?: Record<string, unknown> | null;

  @IsOptional() @IsBoolean() autoArchiveEnabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(3650) autoArchiveDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(36500) retentionPolicyDays?: number;

  @IsOptional() @IsString() @MaxLength(255) smtpHost?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(65535) smtpPort?: number | null;
  @IsOptional() @IsBoolean() smtpSecure?: boolean;
  @IsOptional() @IsString() @MaxLength(255) smtpUser?: string | null;
  @IsOptional() @IsString() @MaxLength(255) smtpPass?: string | null;
  @IsOptional() @IsEmail() @MaxLength(160) smtpFromEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(120) smtpFromName?: string | null;
  @IsOptional() @IsBoolean() emailNotificationsEnabled?: boolean;

  @IsOptional() @IsInt() @Min(8) @Max(128) passwordMinLength?: number;
  @IsOptional() @IsBoolean() passwordRequireUppercase?: boolean;
  @IsOptional() @IsBoolean() passwordRequireLowercase?: boolean;
  @IsOptional() @IsBoolean() passwordRequireNumber?: boolean;
  @IsOptional() @IsBoolean() passwordRequireSymbol?: boolean;
  @IsOptional() @IsInt() @Min(5) @Max(43200) sessionTimeoutMinutes?: number;
  @IsOptional() @IsInt() @Min(3) @Max(20) loginAttemptLimit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1440) loginLockoutMinutes?: number;
}