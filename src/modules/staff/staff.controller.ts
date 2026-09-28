import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StaffService } from './staff.service.js';
import {
  CreateStaffProfileDto,
  SetStaffScheduleDto,
  UpdateStaffProfileDto,
} from './dto/staff.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Staff (Quản lý Nhân sự & Ca làm việc)')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tạo hồ sơ nhân viên mới từ tài khoản người dùng' })
  async createStaffProfile(@Body() dto: CreateStaffProfileDto) {
    const data = await this.staffService.createStaffProfile(dto);
    return {
      message: 'Tạo hồ sơ nhân viên thành công',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhân viên đang hoạt động (có thể lọc theo ID dịch vụ)' })
  @ApiQuery({ name: 'serviceId', required: false, description: 'Lọc danh sách nhân viên làm được dịch vụ này' })
  async findAllStaff(@Query('serviceId') serviceId?: string) {
    const data = await this.staffService.findAllStaff(serviceId);
    return {
      message: 'Lấy danh sách nhân viên thành công',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ nhân viên kèm lịch làm việc và dịch vụ phụ trách' })
  async findStaffById(@Param('id') id: string) {
    const data = await this.staffService.findStaffById(id);
    return {
      message: 'Lấy thông tin nhân viên thành công',
      data,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật thông tin nhân viên hoặc gán danh sách dịch vụ' })
  async updateStaffProfile(
    @Param('id') id: string,
    @Body() dto: UpdateStaffProfileDto,
  ) {
    const data = await this.staffService.updateStaffProfile(id, dto);
    return {
      message: 'Cập nhật hồ sơ nhân viên thành công',
      data,
    };
  }

  @Put(':id/schedules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN/STAFF] Thiết lập lịch làm việc trong tuần (Thứ 2 - CN) cho nhân viên' })
  async setStaffSchedule(
    @Param('id') id: string,
    @Body() dto: SetStaffScheduleDto,
  ) {
    const data = await this.staffService.setStaffSchedule(id, dto);
    return {
      message: 'Thiết lập ca làm việc thành công',
      data,
    };
  }
}
