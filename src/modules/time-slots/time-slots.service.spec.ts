import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TimeSlotsService } from './time-slots.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

describe('TimeSlotsService', () => {
  let service: TimeSlotsService;
  let prisma: any;
  let settingsService: any;

  beforeEach(async () => {
    prisma = {
      service: {
        findUnique: vi.fn(),
      },
      staffProfile: {
        findMany: vi.fn(),
      },
    };

    settingsService = {
      getSettings: vi.fn().mockResolvedValue({
        slotInterval: 30,
        openTime: '08:00',
        closeTime: '18:00',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeSlotsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<TimeSlotsService>(TimeSlotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if service does not exist', async () => {
    prisma.service.findUnique.mockResolvedValue(null);

    await expect(
      service.getAvailableSlots({
        serviceId: 'non-existing',
        date: '2026-12-01',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return empty slots if no staff found', async () => {
    prisma.service.findUnique.mockResolvedValue({
      id: 'srv-1',
      isActive: true,
      durationMin: 30,
    });
    prisma.staffProfile.findMany.mockResolvedValue([]);

    const slots = await service.getAvailableSlots({
      serviceId: 'srv-1',
      date: '2026-12-01',
    });

    expect(slots).toEqual([]);
  });

  it('should calculate slots and exclude overlapping bookings', async () => {
    prisma.service.findUnique.mockResolvedValue({
      id: 'srv-1',
      isActive: true,
      durationMin: 30,
    });

    // 2026-12-01 is a Tuesday (dayOfWeek = 2)
    const bookingStart = new Date('2026-12-01T09:00:00');
    const bookingEnd = new Date('2026-12-01T09:30:00');

    prisma.staffProfile.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        title: 'Master Stylist',
        user: { fullName: 'Nguyen Van Thợ' },
        schedules: [
          {
            dayOfWeek: 2,
            startTime: '08:00',
            endTime: '10:00',
            isDayOff: false,
          },
        ],
        bookings: [
          {
            startTime: bookingStart,
            endTime: bookingEnd,
          },
        ],
      },
    ]);

    const slots = await service.getAvailableSlots({
      serviceId: 'srv-1',
      date: '2026-12-01',
    });

    const times = slots.map((s) => s.time);
    // 08:00 to 10:00 with 30 min duration: candidate slots are 08:00, 08:30, 09:00, 09:30
    // 09:00 to 09:30 is booked, so 09:00 should NOT be in the result!
    expect(times).toContain('08:00');
    expect(times).toContain('08:30');
    expect(times).not.toContain('09:00');
    expect(times).toContain('09:30');
  });
});
