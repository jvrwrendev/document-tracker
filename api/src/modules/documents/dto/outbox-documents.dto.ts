import { IsEnum, IsIn, IsOptional, IsString, Length } from 'class-validator';
import {
  DocumentPriority,
  DocumentStatus,
  DocumentTypeCode,
} from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export enum DocumentReceiptState {
  AWAITING = 'awaiting',
  PARTIAL = 'partial',
  FULLY_RECEIVED = 'fully_received',
}

export class OutboxDocumentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsEnum(DocumentTypeCode)
  typeCode?: DocumentTypeCode;

  @IsOptional()
  @IsEnum(DocumentReceiptState)
  receiptState?: DocumentReceiptState;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'trackingNumber', 'title', 'dueDate'])
  sortBy?: 'createdAt' | 'updatedAt' | 'trackingNumber' | 'title' | 'dueDate';

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
