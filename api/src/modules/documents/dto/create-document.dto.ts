import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import {
  DocumentClassification,
  DocumentPriority,
  DocumentSource,
} from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  @Length(1, 250)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsUUID()
  typeId!: string;

  @IsEnum(DocumentClassification)
  classification!: DocumentClassification;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsEnum(DocumentSource)
  source!: DocumentSource;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  senderName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentNumber?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID()
  originatingOfficeId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  originatingOfficeName?: string;

  @IsUUID()
  currentOfficeId!: string;

// Informational Receiving / Destination Offices.
// 'All offices' is opt-in: when destinationsAllOffices is true (or omitted),
// recipientOfficeIds MUST be empty and the default is a scoped distribution.
// At least one destination is required.
  @IsOptional()
  @IsBoolean()
  destinationsAllOffices?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  recipientOfficeIds?: string[];

  @IsOptional()
  @IsUUID()
  currentHolderId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
