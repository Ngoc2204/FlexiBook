import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SepayWebhookDto {
  @ApiProperty({ example: 123456, description: 'ID giao dịch trên SePay' })
  @IsNotEmpty()
  id!: number | string;

  @ApiProperty({ example: 'MBBank' })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiProperty({ example: '2026-10-01 10:30:00' })
  @IsOptional()
  @IsString()
  transactionDate?: string;

  @ApiProperty({ example: '0123456789' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ example: 'in' })
  @IsOptional()
  @IsString()
  transferType?: string;

  @ApiProperty({ example: 50000, description: 'Số tiền chuyển khoản (VND)' })
  @IsNotEmpty()
  @IsNumber()
  transferAmount!: number;

  @ApiProperty({ example: 'Chuyen tien coc FB-2026-ABCD' })
  @IsNotEmpty()
  @IsString()
  content!: string;

  @ApiProperty({ example: 'FT26123456789' })
  @IsOptional()
  @IsString()
  referenceCode?: string;
}

export class GenerateVietQrDto {
  @ApiProperty({ example: '970422', description: 'Mã ngân hàng (BIN) hoặc tên (ví dụ: MB, VCB, TPB)' })
  @IsNotEmpty()
  @IsString()
  bankCode!: string;

  @ApiProperty({ example: '0123456789', description: 'Số tài khoản thụ hưởng' })
  @IsNotEmpty()
  @IsString()
  accountNumber!: string;

  @ApiProperty({ example: 'NGUYEN VAN A', description: 'Tên chủ tài khoản' })
  @IsNotEmpty()
  @IsString()
  accountName!: string;
}
