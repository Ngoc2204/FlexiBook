import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ServicesService } from './services.service.js';
import { CreateCategoryDto, CreateServiceDto, UpdateServiceDto } from './dto/service.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Services (Dịch vụ & Danh mục)')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // --- Category endpoints ---
  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tạo danh mục dịch vụ mới' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    const data = await this.servicesService.createCategory(dto);
    return {
      message: 'Tạo danh mục thành công',
      data,
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lấy toàn bộ danh mục dịch vụ cùng các dịch vụ trực thuộc' })
  async findAllCategories() {
    const data = await this.servicesService.findAllCategories();
    return {
      message: 'Lấy danh mục dịch vụ thành công',
      data,
    };
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Xóa danh mục dịch vụ' })
  async deleteCategory(@Param('id') id: string) {
    const data = await this.servicesService.deleteCategory(id);
    return {
      message: 'Xóa danh mục dịch vụ thành công',
      data,
    };
  }

  // --- Service endpoints ---
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tạo dịch vụ mới' })
  async createService(@Body() dto: CreateServiceDto) {
    const data = await this.servicesService.createService(dto);
    return {
      message: 'Tạo dịch vụ thành công',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các dịch vụ (có thể lọc theo danh mục)' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Lọc theo ID danh mục' })
  async findAllServices(@Query('categoryId') categoryId?: string) {
    const data = await this.servicesService.findAllServices(categoryId);
    return {
      message: 'Lấy danh sách dịch vụ thành công',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết dịch vụ theo ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.servicesService.findServiceById(id);
    return {
      message: 'Lấy chi tiết dịch vụ thành công',
      data,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật thông tin dịch vụ' })
  async updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    const data = await this.servicesService.updateService(id, dto);
    return {
      message: 'Cập nhật dịch vụ thành công',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Xóa mềm dịch vụ (ẩn dịch vụ)' })
  async deleteService(@Param('id') id: string) {
    const data = await this.servicesService.deleteService(id);
    return {
      message: 'Xóa dịch vụ thành công',
      data,
    };
  }
}
