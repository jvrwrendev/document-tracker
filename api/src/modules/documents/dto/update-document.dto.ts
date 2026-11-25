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
} from '@prisma/client';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  typeId?: string;

  @IsOptional()
  @IsEnum(DocumentClassification)
  classification?: DocumentClassification;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  senderName?: string;

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

  @IsOptional()
  @IsBoolean()
  destinationsAllOffices?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  recipientOfficeIds?: string[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
