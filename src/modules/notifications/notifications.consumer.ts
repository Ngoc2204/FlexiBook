import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { TelegramService } from './telegram.service.js';
import { NOTIFICATION_JOBS, NOTIFICATION_QUEUE } from './notifications.producer.js';

@Processor(NOTIFICATION_QUEUE)
export class NotificationConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.name} [ID: ${job.id}] (Attempt: ${job.attemptsMade + 1})`);

    switch (job.name) {
      case NOTIFICATION_JOBS.BOOKING_CREATED:
        return this.handleBookingCreated(job.data.bookingId);
      case NOTIFICATION_JOBS.PAYMENT_CONFIRMED:
        return this.handlePaymentConfirmed(job.data.bookingId, job.data.amount);
      case NOTIFICATION_JOBS.BOOKING_REMINDER:
        return this.handleBookingReminder(job.data.bookingId);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleBookingCreated(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        staff: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!booking) {
      this.logger.warn(`Booking with ID ${bookingId} not found`);
      return;
    }

    const settings = await this.prisma.businessSetting.findFirst();

    const staffLabel = settings?.staffLabel || 'Nhân viên';
    const serviceLabel = settings?.serviceLabel || 'Dịch vụ';
    const bookingLabel = settings?.bookingLabel || 'Lịch hẹn';
    const businessName = settings?.businessName || 'FlexiBook';

    const startTimeFormatted = new Date(booking.startTime).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });

    const message = [
      `🎉 <b>${bookingLabel.toUpperCase()} MỚI: #${booking.code}</b>`,
      `🏢 Cơ sở: <b>${businessName}</b>`,
      `👤 Khách hàng: <b>${booking.customer.fullName}</b> (<code>${booking.customer.phone}</code>)`,
      `💈 ${staffLabel}: <b>${booking.staff.user.fullName}</b>`,
      `✨ ${serviceLabel}: <b>${booking.service.name}</b>`,
      `🕒 Giờ hẹn: <b>${startTimeFormatted}</b>`,
      `💵 Tổng tiền: <b>${Number(booking.totalAmount).toLocaleString('vi-VN')} VND</b>`,
      `📊 Trạng thái: <b>${booking.status}</b>`,
      booking.note ? `📝 Ghi chú: <i>${booking.note}</i>` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.telegramService.sendMessage(
      settings?.telegramBotToken,
      settings?.telegramChatId,
      message,
    );
  }

  private async handlePaymentConfirmed(bookingId: string, amount: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
      },
    });

    if (!booking) return;

    const settings = await this.prisma.businessSetting.findFirst();

    const message = [
      `💳 <b>XÁC NHẬN TIỀN CỌC THÀNH CÔNG</b>`,
      `📌 Mã lịch hẹn: <b>#${booking.code}</b>`,
      `👤 Khách hàng: <b>${booking.customer.fullName}</b>`,
      `💰 Số tiền nhận: <b>${Number(amount).toLocaleString('vi-VN')} VND</b>`,
      `✅ Trạng thái đặt lịch đã chuyển sang: <b>CONFIRMED</b>`,
    ].join('\n');

    await this.telegramService.sendMessage(
      settings?.telegramBotToken,
      settings?.telegramChatId,
      message,
    );
  }

  private async handleBookingReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        staff: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!booking) return;

    const settings = await this.prisma.businessSetting.findFirst();
    const staffLabel = settings?.staffLabel || 'Nhân viên';
    const serviceLabel = settings?.serviceLabel || 'Dịch vụ';
    const businessName = settings?.businessName || 'FlexiBook';

    const startTimeFormatted = new Date(booking.startTime).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });

    const message = [
      `⏰ <b>[NHẮC HẸN TỰ ĐỘNG] LỊCH HẸN SẮP DIỄN RA TRONG 2 GIỜ NỮA</b>`,
      `🏢 Cơ sở: <b>${businessName}</b>`,
      `📌 Mã lịch: <b>#${booking.code}</b>`,
      `👤 Quý khách: <b>${booking.customer.fullName}</b> (<code>${booking.customer.phone}</code>)`,
      `💈 ${staffLabel}: <b>${booking.staff.user.fullName}</b>`,
      `✨ ${serviceLabel}: <b>${booking.service.name}</b>`,
      `🕒 Giờ hẹn: <b>${startTimeFormatted}</b>`,
      ``,
      `<i>Quý khách vui lòng đến đúng giờ để cơ sở phục vụ chu đáo nhất. Xin cảm ơn!</i>`,
    ].join('\n');

    await this.telegramService.sendMessage(
      settings?.telegramBotToken,
      settings?.telegramChatId,
      message,
    );
  }
}
