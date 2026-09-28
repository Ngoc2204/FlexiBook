import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { AvailableTimeSlot, QueryTimeSlotsDto } from './dto/time-slots.dto.js';

@Injectable()
export class TimeSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Tính toán các khung giờ khả dụng cho dịch vụ và nhân viên trong một ngày cụ thể
   */
  async getAvailableSlots(dto: QueryTimeSlotsDto): Promise<AvailableTimeSlot[]> {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('Dịch vụ không tồn tại hoặc đã ngừng hoạt động');
    }

    const settings = await this.settingsService.getSettings();
    const slotInterval = settings.slotInterval || 30;
    const durationMin = service.durationMin;

    // Parse date (YYYY-MM-DD)
    const targetDate = new Date(`${dto.date}T00:00:00`);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng dùng YYYY-MM-DD');
    }

    const dayOfWeek = targetDate.getDay(); // 0: Sunday, 1: Monday, ... 6: Saturday

    // Boundaries of the day for booking queries
    const startOfDay = new Date(`${dto.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${dto.date}T23:59:59.999Z`);

    // 1. Tìm các nhân viên phụ trách dịch vụ này
    const staffQuery: any = {
      isActive: true,
      services: {
        some: { id: dto.serviceId },
      },
    };

    if (dto.staffId) {
      staffQuery.id = dto.staffId;
    }

    const eligibleStaffs = await this.prisma.staffProfile.findMany({
      where: staffQuery,
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        schedules: {
          where: {
            dayOfWeek,
            isDayOff: false,
          },
        },
        bookings: {
          where: {
            status: { not: BookingStatus.CANCELLED },
            startTime: { gte: startOfDay },
            endTime: { lte: endOfDay },
          },
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (eligibleStaffs.length === 0) {
      return [];
    }

    const slotMap = new Map<
      string,
      { id: string; fullName: string; title: string | null }[]
    >();

    const now = new Date();
    const isToday =
      now.getFullYear() === targetDate.getFullYear() &&
      now.getMonth() === targetDate.getMonth() &&
      now.getDate() === targetDate.getDate();

    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

    for (const staff of eligibleStaffs) {
      const schedule = staff.schedules[0];
      if (!schedule) {
        // Staff is off or has no shift configured for this dayOfWeek
        continue;
      }

      const shiftStartMin = this.timeToMinutes(schedule.startTime);
      const shiftEndMin = this.timeToMinutes(schedule.endTime);

      // Booked time ranges for this staff in minutes
      const bookedRanges = staff.bookings.map((b) => ({
        start: this.dateToMinutes(b.startTime),
        end: this.dateToMinutes(b.endTime),
      }));

      // Generate slots in increments of slotInterval
      for (
        let slotStart = shiftStartMin;
        slotStart + durationMin <= shiftEndMin;
        slotStart += slotInterval
      ) {
        const slotEnd = slotStart + durationMin;

        // If today, filter out past slots (with a 15-minute lead buffer)
        if (isToday && slotStart <= currentMinutes + 15) {
          continue;
        }

        // Check for collision with existing non-cancelled bookings
        const hasCollision = bookedRanges.some(
          (booked) => Math.max(slotStart, booked.start) < Math.min(slotEnd, booked.end),
        );

        if (!hasCollision) {
          const timeString = this.minutesToTime(slotStart);
          const staffInfo = {
            id: staff.id,
            fullName: staff.user.fullName,
            title: staff.title,
          };

          const existing = slotMap.get(timeString) || [];
          existing.push(staffInfo);
          slotMap.set(timeString, existing);
        }
      }
    }

    // Convert map to sorted array
    const sortedTimes = Array.from(slotMap.keys()).sort((a, b) =>
      this.timeToMinutes(a) - this.timeToMinutes(b),
    );

    return sortedTimes.map((time) => ({
      time,
      availableStaff: slotMap.get(time) || [],
    }));
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private dateToMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }
}
