-- Settings module: system settings, user notification preferences, backups

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'incoming_document';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'receipt_acknowledged';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'recipient_note';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'archived';

CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "systemName" TEXT NOT NULL DEFAULT 'CityDocs DMS',
    "organizationName" TEXT NOT NULL DEFAULT '',
    "organizationLogoUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'MMM DD, YYYY',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "trackingPrefix" TEXT NOT NULL DEFAULT 'DMS',
    "trackingYearFormat" TEXT NOT NULL DEFAULT 'YYYY',
    "trackingNumberPadding" INTEGER NOT NULL DEFAULT 4,
    "defaultDocumentPriority" "DocumentPriority" NOT NULL DEFAULT 'normal',
    "maxAttachmentSizeMb" INTEGER NOT NULL DEFAULT 25,
    "allowedAttachmentTypes" TEXT[] DEFAULT ARRAY['pdf','doc','docx','xls','xlsx','png','jpg','jpeg']::TEXT[],
    "documentRegistrationPrefs" JSONB,
    "autoArchiveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoArchiveDays" INTEGER NOT NULL DEFAULT 7,
    "retentionPolicyDays" INTEGER NOT NULL DEFAULT 365,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromEmail" TEXT,
    "smtpFromName" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "passwordRequireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireLowercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireNumber" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSymbol" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "loginAttemptLimit" INTEGER NOT NULL DEFAULT 5,
    "loginLockoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomingDocuments" BOOLEAN NOT NULL DEFAULT true,
    "receiptAcknowledged" BOOLEAN NOT NULL DEFAULT true,
    "recipientNotes" BOOLEAN NOT NULL DEFAULT true,
    "overdueDocuments" BOOLEAN NOT NULL DEFAULT true,
    "archivedDocuments" BOOLEAN NOT NULL DEFAULT true,
    "soundEffects" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");
CREATE INDEX "UserNotificationPreference_userId_idx" ON "UserNotificationPreference"("userId");

CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupRecord_createdAt_idx" ON "BackupRecord"("createdAt");

INSERT INTO "SystemSetting" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
