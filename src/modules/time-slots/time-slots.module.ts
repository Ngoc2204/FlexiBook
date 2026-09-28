import { Module } from '@nestjs/common';
import { TimeSlotsService } from './time-slots.service.js';
import { TimeSlotsController } from './time-slots.controller.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService],
  exports: [TimeSlotsService],
})
export class TimeSlotsModule {}
