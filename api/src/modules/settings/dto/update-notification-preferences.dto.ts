import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional() @IsBoolean() incomingDocuments?: boolean;
  @IsOptional() @IsBoolean() receiptAcknowledged?: boolean;
  @IsOptional() @IsBoolean() recipientNotes?: boolean;
  @IsOptional() @IsBoolean() overdueDocuments?: boolean;
  @IsOptional() @IsBoolean() archivedDocuments?: boolean;
  @IsOptional() @IsBoolean() soundEffects?: boolean;
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
}