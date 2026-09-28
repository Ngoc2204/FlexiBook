import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto, QueryBookingsDto, UpdateBookingStatusDto } from './dto/booking.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Bookings (Quản lý Đặt lịch & Chống trùng lịch bằng Redis Lock)')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Đặt lịch dịch vụ mới',
    description:
      'Sử dụng Redis Mutex Distributed Lock chống race condition khi 2 người cùng đặt 1 slot, kết hợp Transaction database và đẩy Event vào BullMQ queue.',
  })
  @ApiResponse({ status: 201, description: 'Đặt lịch thành công' })
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    const userId = req.user?.id;
    const data = await this.bookingsService.createBooking(dto, userId);
    return {
      message: 'Đặt lịch hẹn thành công',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các lịch hẹn theo ngày, nhân viên hoặc trạng thái' })
  async findAll(@Query() query: QueryBookingsDto) {
    const data = await this.bookingsService.findAll(query);
    return {
      message: 'Lấy danh sách lịch hẹn thành công',
      data,
    };
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Tra cứu thông tin lịch hẹn bằng Mã đặt lịch (Ví dụ: FB-2026-ABCD)' })
  async findByCode(@Param('code') code: string) {
    const data = await this.bookingsService.findByCode(code);
    return {
      message: 'Tra cứu lịch hẹn thành công',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết lịch hẹn theo ID' })
  async findById(@Param('id') id: string) {
    const data = await this.bookingsService.findById(id);
    return {
      message: 'Lấy thông tin lịch hẹn thành công',
      data,
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STAFF/ADMIN] Cập nhật trạng thái lịch hẹn' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const data = await this.bookingsService.updateStatus(id, dto);
    return {
      message: 'Cập nhật trạng thái lịch hẹn thành công',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy lịch hẹn' })
  async cancelBooking(@Param('id') id: string) {
    const data = await this.bookingsService.cancelBooking(id);
    return {
      message: 'Hủy lịch hẹn thành công',
      data,
    };
  }
}
