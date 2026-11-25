import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentTrackingService } from './document-tracking.service';
import { RecordTrackingDto, FilterTrackingDto } from './dto/tracking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-tracking')
export class DocumentTrackingController {
  constructor(private readonly trackingService: DocumentTrackingService) {}

  @Permissions('tracking.view')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(@Body() dto: RecordTrackingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trackingService.record(dto, user.id);
  }

  @Permissions('tracking.view')
  @Get()
  findAll(@Query() filter: FilterTrackingDto) {
    return this.trackingService.findAll(filter);
  }

  @Permissions('tracking.view')
  @Get('document/:documentId')
  findByDocument(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.trackingService.findByDocument(documentId);
  }
}
