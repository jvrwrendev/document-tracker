import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import corsConfig from './config/cors.config';
import throttlerConfig from './config/throttler.config';
import storageConfig from './config/storage.config';
import mailConfig from './config/mail.config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { OfficesModule } from './modules/offices/offices.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DocumentTypesModule } from './modules/document-types/document-types.module';
import { DocumentAttachmentsModule } from './modules/document-attachments/document-attachments.module';
import { DocumentReviewModule } from './modules/document-review/document-review.module';
import { DocumentTrackingModule } from './modules/document-tracking/document-tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { FormDraftsModule } from './modules/form-drafts/form-drafts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, corsConfig, throttlerConfig, storageConfig, mailConfig],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttler.ttl') ?? 900_000,
          limit: config.get<number>('throttler.limit') ?? 100,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    OfficesModule,
    EmployeesModule,
    DocumentsModule,
    DocumentTypesModule,
    DocumentAttachmentsModule,
    DocumentReviewModule,
    DocumentTrackingModule,
    NotificationsModule,
    AuditLogsModule,
    FormDraftsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
