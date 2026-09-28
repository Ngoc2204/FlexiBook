import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Cắt gội tạo kiểu', description: 'Tên danh mục dịch vụ' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name!: string;
}

export class CreateServiceDto {
  @ApiProperty({ example: 'Combo Cắt Tóc + Gội Massage 7 Bước', description: 'Tên dịch vụ' })
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Quy trình phục hồi chuyên sâu và tạo kiểu chuẩn phong cách', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150000, description: 'Giá dịch vụ (VND)' })
  @IsNotEmpty({ message: 'Giá dịch vụ không được để trống' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 45, description: 'Thời gian thực hiện (phút)' })
  @IsNotEmpty({ message: 'Thời gian làm không được để trống' })
  @IsInt()
  @Min(10)
  durationMin!: number;

  @ApiProperty({ example: 'uuid-category-id', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 'https://example.com/haircut.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: true, default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
