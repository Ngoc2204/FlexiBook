import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryTimeSlotsDto {
  @ApiProperty({ example: 'uuid-service-id', description: 'ID của dịch vụ cần đặt' })
  @IsNotEmpty({ message: 'serviceId không được để trống' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ example: '2026-10-01', description: 'Ngày hẹn định dạng YYYY-MM-DD' })
  @IsNotEmpty({ message: 'date không được để trống' })
  @IsDateString({}, { message: 'date phải có định dạng YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: 'uuid-staff-id', required: false, description: 'ID nhân viên (bỏ trống nếu muốn xem lịch của bất kỳ nhân viên nào khả dụng)' })
  @IsOptional()
  @IsString()
  staffId?: string;
}

export interface AvailableTimeSlot {
  time: string; // "09:00"
  availableStaff: {
    id: string;
    fullName: string;
    title: string | null;
  }[];
}
