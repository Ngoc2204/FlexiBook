import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { TimeSlotsModule } from './modules/time-slots/time-slots.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('redis.url');
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          return {
            connection: {
              host: parsed.hostname,
              port: parseInt(parsed.port || '6379', 10),
              password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
              username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
              lazyConnect: true,
              maxRetriesPerRequest: 1,
            },
          };
        }
        return {
          connection: {
            host: config.get<string>('redis.host', 'localhost'),
            port: config.get<number>('redis.port', 6379),
            password: config.get<string>('redis.password'),
            lazyConnect: true,
            maxRetriesPerRequest: 1,
          },
        };
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    SettingsModule,
    ServicesModule,
    StaffModule,
    TimeSlotsModule,
    BookingsModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
