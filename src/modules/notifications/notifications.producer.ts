import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const NOTIFICATION_QUEUE = 'notifications';

export const NOTIFICATION_JOBS = {
  BOOKING_CREATED: 'send_booking_notification',
  BOOKING_REMINDER: 'send_reminder_notification',
  PAYMENT_CONFIRMED: 'send_payment_notification',
} as const;

@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  async sendBookingNotification(bookingId: string) {
    try {
      await this.queue.add(
        NOTIFICATION_JOBS.BOOKING_CREATED,
        { bookingId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );
      this.logger.log(`Enqueued booking notification job for booking: ${bookingId}`);
    } catch (error) {
      this.logger.warn(`Failed to enqueue notification job: ${(error as Error).message}`);
    }
  }

  async sendPaymentNotification(bookingId: string, amount: number) {
    try {
      await this.queue.add(
        NOTIFICATION_JOBS.PAYMENT_CONFIRMED,
        { bookingId, amount },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to enqueue payment notification job: ${(error as Error).message}`);
    }
  }
}
