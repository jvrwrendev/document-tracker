import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentReviewService } from './document-review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilterReviewsDto } from './dto/filter-reviews.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-review')
export class DocumentReviewController {
  constructor(private readonly reviewService: DocumentReviewService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.DOCUMENT_OFFICER)
  @Permissions('documents.edit')
  @Audit('review.create', 'review', 'DocumentReview')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewService.create(dto, user.id);
  }

  @Permissions('documents.view')
  @Get()
  findAll(@Query() filter: FilterReviewsDto) {
    return this.reviewService.findAll(filter);
  }

  @Permissions('documents.view')
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reviewService.findOne(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.DOCUMENT_OFFICER)
  @Permissions('documents.edit')
  @Patch(':id')
  @Audit('review.update', 'review', 'DocumentReview')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Permissions('documents.edit')
  @Delete(':id')
  @Audit('review.delete', 'review', 'DocumentReview')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reviewService.remove(id);
  }
}
