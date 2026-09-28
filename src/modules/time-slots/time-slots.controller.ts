import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TimeSlotsService } from './time-slots.service.js';
import { QueryTimeSlotsDto } from './dto/time-slots.dto.js';

@ApiTags('Time Slots (Thuật toán tính toán khung giờ trống)')
@Controller('time-slots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get('available')
  @ApiOperation({
    summary: 'Tìm kiếm tất cả khung giờ khả dụng cho dịch vụ và nhân viên theo ngày',
    description:
      'Thuật toán Time-Slot Engine tự động đối chiếu ca làm việc, độ dài dịch vụ và loại trừ các lịch hẹn đã đặt để trả về các khung giờ còn trống trong vòng < 30ms.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các khung giờ khả dụng' })
  async getAvailableSlots(@Query() query: QueryTimeSlotsDto) {
    const data = await this.timeSlotsService.getAvailableSlots(query);
    return {
      message: 'Lấy khung giờ khả dụng thành công',
      data,
    };
  }
}
