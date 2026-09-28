import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { NotificationProducer } from './notifications.producer.js';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationProducer: NotificationProducer,
  ) {}

  /**
   * Cronjob tự động quét các lịch hẹn sắp diễn ra trong khoảng 2 tiếng tới
   * Chạy định kỳ mỗi 10 phút một lần
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleUpcomingReminders() {
    this.logger.log('Executing automated booking reminder scanner...');

    const now = new Date();
    // Khung quét: từ 1h50m đến 2h10m kể từ thời điểm hiện tại (~2 tiếng)
    const startWindow = new Date(now.getTime() + 110 * 60 * 1000);
    const endWindow = new Date(now.getTime() + 130 * 60 * 1000);

    try {
      const upcomingBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          startTime: {
            gte: startWindow,
            lte: endWindow,
          },
        },
      });

      if (upcomingBookings.length === 0) {
        this.logger.debug('No upcoming bookings in 2-hour window.');
        return;
      }

      this.logger.log(`Found ${upcomingBookings.length} booking(s) approaching in 2 hours.`);

      for (const booking of upcomingBookings) {
        // Đảm bảo Idempotent: Kiểm tra xem đã gửi nhắc hẹn cho booking này chưa
        const reminderKey = `reminder:sent:2h:${booking.id}`;
        const alreadySent = await this.redisService.get(reminderKey);

        if (!alreadySent) {
          // Lưu vào redis với TTL 4 tiếng để không nhắc lại lần 2
          await this.redisService.set(reminderKey, 'true', 4 * 3600);
          await this.notificationProducer.sendReminderNotification(booking.id);
        }
      }
    } catch (error) {
      this.logger.error(`Error in reminder scanner: ${(error as Error).message}`);
    }
  }
}
