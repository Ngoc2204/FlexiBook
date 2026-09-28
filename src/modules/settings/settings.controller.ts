import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service.js';
import { UpdateBusinessSettingDto } from './dto/settings.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Settings (Cấu hình White-label & Nhãn thuật ngữ)')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình cơ sở kinh doanh, nhãn động (Dynamic Terminology) và giờ làm việc' })
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  async getSettings() {
    const data = await this.settingsService.getSettings();
    return {
      message: 'Lấy cấu hình cơ sở thành công',
      data,
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật cấu hình cơ sở, Telegram token, tiền cọc, bước nhảy lịch hẹn' })
  @ApiResponse({ status: 200, description: 'Cập nhật cấu hình thành công' })
  async updateSettings(@Body() dto: UpdateBusinessSettingDto) {
    const data = await this.settingsService.updateSettings(dto);
    return {
      message: 'Cập nhật cấu hình thành công',
      data,
    };
  }
}
