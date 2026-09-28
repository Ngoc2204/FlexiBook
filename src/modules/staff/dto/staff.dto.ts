import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleItemDto {
  @ApiProperty({ example: 1, description: 'Ngày trong tuần (0: Chủ nhật, 1: Thứ 2, ..., 6: Thứ 7)' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '08:00', description: 'Giờ bắt đầu làm việc' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime phải có định dạng HH:mm' })
  startTime!: string;

  @ApiProperty({ example: '18:00', description: 'Giờ kết thúc làm việc' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime phải có định dạng HH:mm' })
  endTime!: string;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  isDayOff!: boolean;
}

export class CreateStaffProfileDto {
  @ApiProperty({ example: 'uuid-user-id', description: 'ID của tài khoản người dùng tương ứng' })
  @IsNotEmpty({ message: 'userId không được để trống' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'Master Stylist / Bác sĩ CKI', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ example: 'Kinh nghiệm 8 năm trong ngành...', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: ['service-id-1', 'service-id-2'], required: false, description: 'Danh sách ID dịch vụ thợ có thể làm' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];
}

export class UpdateStaffProfileDto extends PartialType(CreateStaffProfileDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetStaffScheduleDto {
  @ApiProperty({ type: [ScheduleItemDto], description: 'Danh sách lịch làm việc trong tuần của nhân viên' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules!: ScheduleItemDto[];
}
