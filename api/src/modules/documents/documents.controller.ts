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
import { SkipThrottle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentsDto } from './dto/filter-documents.dto';
import { CheckDocumentNumberDto } from './dto/check-document-number.dto';
import { ReceiveDocumentDto } from './dto/receive-document.dto';
import { SetRecipientNoteDto } from './dto/set-recipient-note.dto';
import { DeleteAllDocumentsDto } from './dto/delete-all-documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Permissions('documents.register')
  @Audit('document.register', 'documents', 'Document')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.create(dto, user.id);
  }

  @SkipThrottle()
  @Permissions('documents.view')
  @Get()
  findAll(
    @Query() filter: FilterDocumentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findAll(filter, user.id);
  }

  @SkipThrottle()
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Get('document-number-suggestion/:officeId')
  suggestDocumentNumber(
    @Param('officeId', new ParseUUIDPipe()) officeId: string,
  ) {
    return this.documentsService.getDocumentNumberSuggestion(officeId);
  }

  @SkipThrottle()
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Get('check-document-number')
  checkDocumentNumber(@Query() query: CheckDocumentNumberDto) {
    return this.documentsService.checkDocumentNumberAvailability(
      query.documentNumber,
      query.originatingOfficeId,
    );
  }

  @SkipThrottle()
  @Permissions('documents.view')
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findOne(id, user.id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Permissions('documents.edit')
  @Audit('document.update', 'documents', 'Document')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Permissions('documents.delete')
  @Audit('document.delete-all', 'documents', 'Document')
  @Delete()
  @HttpCode(HttpStatus.OK)
  removeAll(@Body() dto: DeleteAllDocumentsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.removeAll(user.id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Permissions('documents.delete')
  @Audit('document.delete', 'documents', 'Document')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.remove(id, user.id);
  }

  @SkipThrottle()
  @Permissions('documents.view')
  @Get(':id/history')
  getHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documentsService.getHistory(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.DOCUMENT_OFFICER)
  @Permissions('documents.receive')
  @Audit('document.receive', 'documents', 'Document')
  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  receive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReceiveDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.receive(id, user.id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Audit('document.recipient-note.set', 'documents', 'Document')
  @Post(':id/recipients/:officeId/note')
  @HttpCode(HttpStatus.OK)
  setRecipientNote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('officeId', new ParseUUIDPipe()) officeId: string,
    @Body() dto: SetRecipientNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.setRecipientNote(id, officeId, user.id, dto.note);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Audit('document.recipient-note.delete', 'documents', 'Document')
  @Delete(':id/recipients/:officeId/note')
  @HttpCode(HttpStatus.OK)
  deleteRecipientNote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('officeId', new ParseUUIDPipe()) officeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.deleteRecipientNote(id, officeId, user.id);
  }

  @SkipThrottle()
  @Permissions('documents.view')
  @Get(':id/timeline')
  getTimeline(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documentsService.getTimeline(id);
  }
}
