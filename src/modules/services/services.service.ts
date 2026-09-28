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
    return this.prisma.service.findMany({
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
