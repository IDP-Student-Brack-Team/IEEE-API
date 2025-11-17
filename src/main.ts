import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  app.useGlobalPipes(new ValidationPipe())
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuração de CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || '*',
    credentials: true,
  });

  // Prefixo global para todas as rotas
  app.setGlobalPrefix('api/v1');

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('IEEE API')
    .setDescription('API para gerenciamento de eventos do IEEE')
    .setVersion('1.0')
    .addTag('auth', 'Autenticação e Autorização')
    .addTag('users', 'Gerenciamento de Usuários')
    .addTag('events', 'Gerenciamento de Eventos')
    .addTag('comments', 'Sistema de Comentários')
    .addTag('registrations', 'Inscrições em Eventos')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
