import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { SepayWebhookDto } from './dto/payment.dto.js';

@ApiTags('Payments (VietQR & Webhook SePay)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('sepay-webhook')
  @ApiOperation({
    summary: 'Webhook nhận thông báo biến động số dư từ SePay / Casso',
    description:
      'Tự động quét mã đặt lịch trong nội dung chuyển khoản, kiểm tra số tiền cọc và tự động chuyển trạng thái lịch sang CONFIRMED.',
  })
  @ApiResponse({ status: 200, description: 'Xử lý webhook thành công' })
  async handleSepayWebhook(@Body() dto: SepayWebhookDto) {
    const result = await this.paymentsService.processSepayWebhook(dto);
    return {
      message: result.message,
      data: result,
    };
  }

  @Get('vietqr/:bookingCode')
  @ApiOperation({ summary: 'Tạo mã QR VietQR chuẩn để khách quét chuyển khoản đặt cọc' })
  @ApiQuery({ name: 'bankCode', required: false, example: 'MB' })
  @ApiQuery({ name: 'accountNumber', required: false, example: '0123456789' })
  @ApiQuery({ name: 'accountName', required: false, example: 'FLEXIBOOK' })
  async getVietQr(
    @Param('bookingCode') bookingCode: string,
    @Query('bankCode') bankCode?: string,
    @Query('accountNumber') accountNumber?: string,
    @Query('accountName') accountName?: string,
  ) {
    const data = await this.paymentsService.getVietQrInfo(
      bookingCode,
      bankCode,
      accountNumber,
      accountName,
    );
    return {
      message: 'Tạo mã VietQR thành công',
      data,
    };
  }
}
