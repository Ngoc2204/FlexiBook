import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationProducer } from '../notifications/notifications.producer.js';
import { SepayWebhookDto } from './dto/payment.dto.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationProducer: NotificationProducer,
  ) {}

  /**
   * Xử lý webhook từ SePay / VietQR khi có biến động số dư ngân hàng
   */
  async processSepayWebhook(dto: SepayWebhookDto) {
    this.logger.log(`Received SePay webhook: ${dto.content}, amount: ${dto.transferAmount}`);

    // Chỉ xử lý tiền chuyển vào (transferType = "in")
    if (dto.transferType && dto.transferType.toLowerCase() !== 'in') {
      return { success: false, message: 'Bỏ qua giao dịch không phải chiều nạp (in)' };
    }

    // Trích xuất mã đặt lịch dạng FB-YYYY-XXXX từ nội dung chuyển khoản
    const bookingCodeRegex = /FB-\d{4}-[A-Z0-9]{4}/i;
    const match = dto.content.match(bookingCodeRegex);

    if (!match) {
      this.logger.warn(`Không tìm thấy mã booking hợp lệ trong nội dung: "${dto.content}"`);
      return { success: false, message: 'Nội dung không chứa mã booking hợp lệ' };
    }

    const bookingCode = match[0].toUpperCase();

    const booking = await this.prisma.booking.findUnique({
      where: { code: bookingCode },
      include: { customer: true },
    });

    if (!booking) {
      this.logger.warn(`Không tìm thấy booking với mã: ${bookingCode}`);
      return { success: false, message: `Không tìm thấy booking ${bookingCode}` };
    }

    // Kiểm tra số tiền chuyển có đủ tiền cọc không
    const requiredDeposit = Number(booking.depositAmount);
    if (requiredDeposit > 0 && dto.transferAmount < requiredDeposit) {
      this.logger.warn(
        `Số tiền cọc chưa đủ: Nhận ${dto.transferAmount} < Yêu cầu ${requiredDeposit}`,
      );
      return { success: false, message: 'Số tiền chuyển nhỏ hơn tiền cọc yêu cầu' };
    }

    // Cập nhật trạng thái Booking sang CONFIRMED
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        isPaidDeposit: true,
        transactionRef: dto.referenceCode || String(dto.id),
      },
    });

    this.logger.log(`Booking #${bookingCode} đã xác nhận cọc thành công qua SePay Webhook!`);

    // Bắn thông báo qua Telegram thông qua BullMQ Queue
    await this.notificationProducer.sendPaymentNotification(booking.id, dto.transferAmount);

    return {
      success: true,
      message: `Đã xác nhận thanh toán cọc thành công cho booking #${bookingCode}`,
      bookingId: updated.id,
    };
  }

  /**
   * Tạo đường dẫn ảnh mã VietQR tự động để khách quét thanh toán
   */
  async getVietQrInfo(
    bookingCode: string,
    bankCode: string = 'MB',
    accountNumber: string = '0123456789',
    accountName: string = 'FLEXIBOOK',
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { code: bookingCode },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy booking với mã ${bookingCode}`);
    }

    const amount = Number(booking.depositAmount) > 0 ? Number(booking.depositAmount) : Number(booking.totalAmount);
    const description = encodeURIComponent(`Thanh toan ${booking.code}`);
    const encodedName = encodeURIComponent(accountName);

    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.png?amount=${amount}&addInfo=${description}&accountName=${encodedName}`;

    return {
      bookingCode: booking.code,
      amount,
      qrUrl,
      bankCode,
      accountNumber,
      accountName,
      transferContent: `Thanh toan ${booking.code}`,
    };
  }
}
