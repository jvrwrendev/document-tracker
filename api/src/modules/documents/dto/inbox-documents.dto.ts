import { IsEnum, IsIn, IsOptional, IsString, Length } from 'class-validator';
import {
  DocumentPriority,
  DocumentStatus,
  RecipientStatus,
} from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class InboxDocumentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsOptional()
  @IsEnum(RecipientStatus)
  recipientStatus?: RecipientStatus;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'trackingNumber', 'title', 'dueDate'])
  sortBy?: 'createdAt' | 'updatedAt' | 'trackingNumber' | 'title' | 'dueDate';

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
