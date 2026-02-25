import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: true,
    credentials: true,
    methods: '*',
    allowedHeaders: '*',
    exposedHeaders: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Free Go API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'authorization' }, 'initData')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'swagger',
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 4000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger: http://localhost:${port}/docs`);
}
bootstrap();
