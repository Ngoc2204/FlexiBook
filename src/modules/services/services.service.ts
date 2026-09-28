import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateCategoryDto, CreateServiceDto, UpdateServiceDto } from './dto/service.dto.js';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Category methods ---
  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: { name: dto.name },
    });
  }

  async findAllCategories() {
    return this.prisma.serviceCategory.findMany({
      include: {
        services: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy danh mục dịch vụ');
    }
    return this.prisma.serviceCategory.delete({ where: { id } });
  }

  // --- Service methods ---
  async createService(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        durationMin: dto.durationMin,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
      },
    });
  }

  async findAllServices(categoryId?: string) {
    let list = await this.prisma.service.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        isActive: true,
      },
      include: {
        category: true,
        staffs: {
          select: {
            id: true,
            title: true,
            avatarUrl: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (list.length === 0 && !categoryId) {
      await this.autoSeedServicesAndStaff();
      list = await this.prisma.service.findMany({
        where: { isActive: true },
        include: {
          category: true,
          staffs: {
            select: {
              id: true,
              title: true,
              avatarUrl: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return list;
  }

  private async autoSeedServicesAndStaff() {
    try {
      const cat = await this.prisma.serviceCategory.create({
        data: { name: 'Dịch vụ Tiêu biểu' },
      });

      const s1 = await this.prisma.service.create({
        data: {
          categoryId: cat.id,
          name: 'Combo Cắt Tóc + Gội Massage Thư Giãn',
          description: 'Tư vấn dáng tóc, cắt gội tạo kiểu chuẩn phong cách với tinh dầu cao cấp.',
          price: 120000,
          durationMin: 45,
          isActive: true,
        },
      });

      const s2 = await this.prisma.service.create({
        data: {
          categoryId: cat.id,
          name: 'Uốn / Nhuộm Xu Hướng Thời Thượng',
          description: 'Công nghệ phục hồi và uốn sóng lơi không xơ rối, giữ nếp bền lâu.',
          price: 350000,
          durationMin: 60,
          isActive: true,
        },
      });

      const s3 = await this.prisma.service.create({
        data: {
          categoryId: cat.id,
          name: 'Gói Trị Liệu & Massage Cổ Vai Gáy Chuyên Sâu',
          description: 'Đả thông kinh lạc, giảm nhức mỏi văn phòng kết hợp chườm thảo dược.',
          price: 220000,
          durationMin: 45,
          isActive: true,
        },
      });

      // Default staff
      const user = await this.prisma.user.upsert({
        where: { phone: '0911223344' },
        update: {},
        create: {
          phone: '0911223344',
          fullName: 'Trần Hoàng Nam',
          role: 'STAFF',
        },
      });

      const staff = await this.prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: {
          services: { connect: [{ id: s1.id }, { id: s2.id }, { id: s3.id }] },
        },
        create: {
          userId: user.id,
          title: 'Master Stylist (8 năm kinh nghiệm)',
          bio: 'Chuyên gia tạo mẫu tóc và định hình phong cách cá nhân.',
          isActive: true,
          services: { connect: [{ id: s1.id }, { id: s2.id }, { id: s3.id }] },
        },
      });

      for (let day = 0; day <= 6; day++) {
        await this.prisma.staffSchedule.createMany({
          data: [{
            staffId: staff.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '20:00',
            isDayOff: false,
          }],
          skipDuplicates: true,
        });
      }
    } catch {
      // Ignore if concurrent seed
    }
  }

  async findServiceById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        staffs: {
          select: {
            id: true,
            title: true,
            avatarUrl: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Không tìm thấy dịch vụ');
    }

    return service;
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    await this.findServiceById(id);

    return this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
      },
      include: {
        category: true,
      },
    });
  }

  async deleteService(id: string) {
    await this.findServiceById(id);

    // Soft delete by setting isActive to false
    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
