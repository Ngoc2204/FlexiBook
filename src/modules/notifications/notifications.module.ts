import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATION_QUEUE, NotificationProducer } from './notifications.producer.js';
import { NotificationConsumer } from './notifications.consumer.js';
import { TelegramService } from './telegram.service.js';
import { ReminderScheduler } from './reminder.scheduler.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  providers: [TelegramService, NotificationProducer, NotificationConsumer, ReminderScheduler],
  exports: [NotificationProducer, TelegramService],
})
export class NotificationsModule {}
