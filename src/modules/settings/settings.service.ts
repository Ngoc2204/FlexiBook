import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { UpdateBusinessSettingDto } from './dto/settings.dto.js';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.businessSetting.findFirst();

    if (!settings) {
      settings = await this.prisma.businessSetting.create({
        data: {
          businessName: 'FlexiBook System',
          industry: 'GENERAL',
          staffLabel: 'Nhân viên',
          serviceLabel: 'Dịch vụ',
          bookingLabel: 'Lịch hẹn',
          openTime: '08:00',
          closeTime: '21:00',
          slotInterval: 30,
        },
      });
      this.logger.log('Initialized default business settings');
    }

    return settings;
  }

  async updateSettings(dto: UpdateBusinessSettingDto) {
    const existing = await this.getSettings();

    const updated = await this.prisma.businessSetting.update({
      where: { id: existing.id },
      data: {
        ...dto,
      },
    });

    return updated;
  }
}
