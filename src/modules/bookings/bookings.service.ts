import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { NotificationProducer } from '../notifications/notifications.producer.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreateBookingDto, QueryBookingsDto, UpdateBookingStatusDto } from './dto/booking.dto.js';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationProducer: NotificationProducer,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Tạo đơn đặt lịch mới với cơ chế Distributed Lock (Redis Mutex)
   * chống Race Condition / Double-booking hoàn hảo
   */
  async createBooking(dto: CreateBookingDto, authenticatedUserId?: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service || !service.isActive) {
      throw new NotFoundException('Dịch vụ không tồn tại hoặc đã ngừng hoạt động');
    }

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: dto.staffId },
      include: {
        services: true,
      },
    });
    if (!staff || !staff.isActive) {
      throw new NotFoundException('Nhân viên không tồn tại hoặc đã ngừng hoạt động');
    }

    // Verify staff can perform this service
    const canPerform = staff.services.some((s) => s.id === dto.serviceId);
    if (!canPerform) {
      throw new BadRequestException('Nhân viên này không phụ trách dịch vụ được chọn');
    }

    const startTime = new Date(dto.startTime);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Thời gian bắt đầu không hợp lệ');
    }

    // Calculate endTime based on service duration
    const endTime = new Date(startTime.getTime() + service.durationMin * 60 * 1000);

    // Xác định khách hàng (authenticated user hoặc tạo mới nếu chưa có)
    let customerId = authenticatedUserId;
    if (!customerId) {
      if (!dto.customerPhone || !dto.customerName) {
        throw new BadRequestException('Vui lòng cung cấp số điện thoại và họ tên khách hàng');
      }

      let customer = await this.prisma.user.findUnique({
        where: { phone: dto.customerPhone },
      });

      if (!customer) {
        customer = await this.prisma.user.create({
          data: {
            phone: dto.customerPhone,
            fullName: dto.customerName,
            role: 'CUSTOMER',
          },
        });
      }
      customerId = customer.id;
    }

    // 1. Áp dụng Distributed Lock trên Redis
    const lockKey = `lock:booking:${dto.staffId}:${startTime.toISOString()}`;
    const acquired = await this.redisService.acquireLock(lockKey, 5000); // 5s TTL

    if (!acquired) {
      throw new ConflictException(
        'Khung giờ này đang có người khác thao tác đặt, vui lòng chọn lại sau vài giây!',
      );
    }

    try {
      const settings = await this.settingsService.getSettings();
      const code = this.generateBookingCode();

      const initialStatus = settings.requireDeposit
        ? BookingStatus.PENDING_DEPOSIT
        : BookingStatus.CONFIRMED;

      return await this.prisma.$transaction(async (tx) => {
        // 2. Double-check trong Database xem có booking nào bị trùng khung giờ không
        const existing = await tx.booking.findFirst({
          where: {
            staffId: dto.staffId,
            status: { not: BookingStatus.CANCELLED },
            OR: [
              {
                startTime: { lte: startTime },
                endTime: { gt: startTime },
              },
              {
                startTime: { lt: endTime },
                endTime: { gte: endTime },
              },
              {
                startTime: { gte: startTime },
                endTime: { lte: endTime },
              },
            ],
          },
        });

        if (existing) {
          throw new ConflictException(
            'Rất tiếc! Khung giờ này vừa có người đặt xong, vui lòng chọn khung giờ khác.',
          );
        }

        // 3. Tạo Booking
        const booking = await tx.booking.create({
          data: {
            code,
            customerId: customerId!,
            staffId: dto.staffId,
            serviceId: dto.serviceId,
            startTime,
            endTime,
            status: initialStatus,
            note: dto.note,
            totalAmount: service.price,
            depositAmount: settings.requireDeposit ? settings.depositAmount : 0,
            isPaidDeposit: !settings.requireDeposit,
          },
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            staff: {
              include: {
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            service: true,
          },
        });

        // 4. Đẩy event ngầm vào BullMQ queue để gửi tin Telegram/Zalo
        await this.notificationProducer.sendBookingNotification(booking.id);

        return booking;
      });
    } finally {
      // Giải phóng lock
      await this.redisService.releaseLock(lockKey);
    }
  }

  async findAll(query: QueryBookingsDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
        service: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    return booking;
  }

  async findByCode(code: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: {
        customer: true,
        staff: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy lịch hẹn với mã ${code}`);
    }

    return booking;
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    await this.findById(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.transactionRef ? { transactionRef: dto.transactionRef } : {}),
      },
      include: {
        customer: true,
        staff: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });
  }

  async cancelBooking(id: string) {
    const booking = await this.findById(id);

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy lịch hẹn đã hoàn thành');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  private generateBookingCode(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FB-${year}-${randomHex}`;
  }
}
