import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateStaffProfileDto, SetStaffScheduleDto, UpdateStaffProfileDto } from './dto/staff.dto.js';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async createStaffProfile(dto: CreateStaffProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { staffProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    if (user.staffProfile) {
      throw new BadRequestException('Người dùng này đã có hồ sơ nhân viên');
    }

    // Update user role to STAFF if not already ADMIN
    if (user.role === 'CUSTOMER') {
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { role: 'STAFF' },
      });
    }

    return this.prisma.staffProfile.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        services: dto.serviceIds
          ? {
              connect: dto.serviceIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            role: true,
          },
        },
        services: true,
        schedules: true,
      },
    });
  }

  async findAllStaff(serviceId?: string) {
    return this.prisma.staffProfile.findMany({
      where: {
        isActive: true,
        ...(serviceId
          ? {
              services: {
                some: { id: serviceId },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMin: true,
          },
        },
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  async findStaffById(id: string) {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
          },
        },
        services: true,
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return staff;
  }

  async updateStaffProfile(id: string, dto: UpdateStaffProfileDto) {
    await this.findStaffById(id);

    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        title: dto.title,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        isActive: dto.isActive,
        services: dto.serviceIds
          ? {
              set: dto.serviceIds.map((serviceId) => ({ id: serviceId })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
          },
        },
        services: true,
      },
    });
  }

  async setStaffSchedule(staffId: string, dto: SetStaffScheduleDto) {
    await this.findStaffById(staffId);

    // Replace all schedules in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.staffSchedule.deleteMany({
        where: { staffId },
      });

      await tx.staffSchedule.createMany({
        data: dto.schedules.map((s) => ({
          staffId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isDayOff: s.isDayOff,
        })),
      });

      return tx.staffSchedule.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }
}
