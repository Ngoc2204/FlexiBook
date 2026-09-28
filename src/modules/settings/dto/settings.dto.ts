import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IndustryType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateBusinessSettingDto {
  @ApiProperty({ example: 'FlexiBook Barber Studio', required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ enum: IndustryType, default: IndustryType.GENERAL, required: false })
  @IsOptional()
  @IsEnum(IndustryType)
  industry?: IndustryType;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ example: '#3B82F6', required: false })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiProperty({ example: 'Thợ cắt tóc', description: 'Tên gọi nhân sự (Dynamic Terminology)', required: false })
  @IsOptional()
  @IsString()
  staffLabel?: string;

  @ApiProperty({ example: 'Gói dịch vụ tóc', description: 'Tên gọi dịch vụ (Dynamic Terminology)', required: false })
  @IsOptional()
  @IsString()
  serviceLabel?: string;

  @ApiProperty({ example: 'Lịch cắt tóc', description: 'Tên gọi lịch hẹn (Dynamic Terminology)', required: false })
  @IsOptional()
  @IsString()
  bookingLabel?: string;

  @ApiProperty({ example: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', required: false })
  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @ApiProperty({ example: '-1001234567890', required: false })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  requireDeposit?: boolean;

  @ApiProperty({ example: 50000, description: 'Số tiền đặt cọc tối thiểu (VND)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiProperty({ example: '08:00', description: 'Giờ mở cửa định dạng HH:mm', required: false })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime phải có định dạng HH:mm (ví dụ 08:00)' })
  openTime?: string;

  @ApiProperty({ example: '21:00', description: 'Giờ đóng cửa định dạng HH:mm', required: false })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime phải có định dạng HH:mm (ví dụ 21:00)' })
  closeTime?: string;

  @ApiProperty({ example: 30, description: 'Bước nhảy thời gian (phút): 15, 30, 45, 60', required: false })
  @IsOptional()
  @IsInt()
  @Min(10)
  slotInterval?: number;
}
