import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  DocumentClassification,
  DocumentPriority,
  DocumentSource,
  DocumentStatus,
  DocumentTypeCode,
  RecipientStatus,
} from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';
import { DocumentReceiptState } from './outbox-documents.dto';

export class FilterDocumentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    // Query strings arrive as `?statuses=a,b`; a JSON body would already be an
    // array. Normalise both into a real array so @IsArray can pass.
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part: string) => part.trim())
        .filter((part: string) => part.length > 0);
    }
    return value;
  })
  @IsArray()
  @IsEnum(DocumentStatus, { each: true })
  statuses?: DocumentStatus[];

  @IsOptional()
  @IsUUID()
  typeId?: string;

  @IsOptional()
  @IsEnum(DocumentTypeCode)
  typeCode?: DocumentTypeCode;

  @IsOptional()
  @IsEnum(DocumentClassification)
  classification?: DocumentClassification;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsOptional()
  @IsEnum(DocumentSource)
  source?: DocumentSource;

  @IsOptional()
  @IsUUID()
  originatingOfficeId?: string;

  @IsOptional()
  @IsUUID()
  currentOfficeId?: string;

  @IsOptional()
  @IsUUID()
  currentHolderId?: string;

  @IsOptional()
  @IsUUID()
  encodedById?: string;

  @IsOptional()
  @IsUUID()
  receivedById?: string;

  @IsOptional()
  @IsUUID()
  recipientOfficeId?: string;

  @IsOptional()
  @IsEnum(RecipientStatus)
  recipientStatus?: RecipientStatus;

  @IsOptional()
  @IsEnum(DocumentReceiptState)
  receiptState?: DocumentReceiptState;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'trackingNumber' | 'title' | 'dateReceived' | 'dueDate';

  @IsOptional()
  @IsString()
  order: SortOrder = SortOrder.DESC;
}
