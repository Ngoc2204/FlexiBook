import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  // Global Interceptors & Filters
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformResponseInterceptor(),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FlexiBook Engine API')
    .setDescription(
      'Modular Service Booking & Appointment System (White-label Multi-Industry Engine: Spa, Salon, Clinic). ' +
      'Features: Distributed Locking for Concurrency / Double-booking prevention, Dynamic Time-slot Engine, BullMQ background jobs, VietQR Webhook auto confirmation.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth (Xác thực & Người dùng)', 'Đăng ký, đăng nhập JWT, phân quyền Role')
    .addTag('Settings (Cấu hình White-label & Nhãn thuật ngữ)', 'Cấu hình giao diện, thuật ngữ động, giờ mở cửa')
    .addTag('Services (Dịch vụ & Danh mục)', 'Quản lý danh mục và dịch vụ')
    .addTag('Staff (Quản lý Nhân sự & Ca làm việc)', 'Hồ sơ kỹ thuật viên/bác sĩ và thiết lập ca làm việc')
    .addTag('Time Slots (Thuật toán tính toán khung giờ trống)', 'Thuật toán Dynamic Time-slot Engine O(N) dưới 30ms')
    .addTag('Bookings (Quản lý Đặt lịch & Chống trùng lịch bằng Redis Lock)', 'Xử lý đặt lịch với Mutex Lock & Transaction')
    .addTag('Payments (VietQR & Webhook SePay)', 'Xác thực thanh toán cọc tự động')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'FlexiBook Engine API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);

  await app.listen(port);
  logger.log(`🚀 FlexiBook Engine is running on: http://localhost:${port}/api/v1`);
  logger.log(`📑 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
