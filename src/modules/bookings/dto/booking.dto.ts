import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-service-id', description: 'ID dịch vụ cần đặt' })
  @IsNotEmpty({ message: 'serviceId không được để trống' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ example: 'uuid-staff-id', description: 'ID nhân viên phục vụ' })
  @IsNotEmpty({ message: 'staffId không được để trống' })
  @IsString()
  staffId!: string;

  @ApiProperty({
    example: '2026-10-01T09:00:00.000Z',
    description: 'Thời gian bắt đầu hẹn định dạng ISO 8601 UTC',
  })
  @IsNotEmpty({ message: 'startTime không được để trống' })
  @IsDateString({}, { message: 'startTime phải đúng định dạng ISO 8601' })
  startTime!: string;

  @ApiProperty({ example: '0912345678', description: 'Số điện thoại khách hàng (nếu đặt công khai chưa login)', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: 'Nguyễn Văn B', description: 'Họ tên khách hàng (nếu đặt công khai chưa login)', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: 'Cắt tóc ngắn gọn gàng dự đám cưới', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus, example: BookingStatus.CONFIRMED })
  @IsNotEmpty()
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiProperty({ example: 'Mã tham chiếu ngân hàng', required: false })
  @IsOptional()
  @IsString()
  transactionRef?: string;
}

export class QueryBookingsDto {
  @ApiProperty({ required: false, example: '2026-10-01' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ enum: BookingStatus, required: false })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
