import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Auth (Xác thực & Người dùng)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng / nhân viên' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công và trả về access token' })
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return {
      message: 'Đăng ký tài khoản thành công',
      data,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập hệ thống bằng SĐT và mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return {
      message: 'Đăng nhập thành công',
      data,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại từ JWT token' })
  async getProfile(@CurrentUser() user: any) {
    return {
      message: 'Lấy thông tin người dùng thành công',
      data: user,
    };
  }
}
