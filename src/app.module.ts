import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EventsModule } from './modules/events/events.module';
import { CommentsModule } from './modules/comments/comments.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Configuração de variáveis de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting (RNF - Segurança)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    // Módulos da aplicação
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    CommentsModule,
    RegistrationsModule,
    UploadsModule,
    MailModule,
    NotificationsModule,
  ],
})
export class AppModule {}
