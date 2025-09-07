import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser,
  PaginationDto,
} from '../../common';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('المصادقة')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60, limit: 5 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'تسجيل مستخدم جديد (الحقول: اسم، إيميل، كلمة المرور)',
  })
  @ApiBody({ type: RegisterDto })
  @CommonApiCreatedResponse(RegisterDto, 'تم التسجيل بنجاح')
  @ApiBadRequestResponse({ description: 'خطأ في البيانات أو الإيميل موجود' })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60, limit: 5 } }) // 5 requests per minute
  @ApiOperation({ summary: 'تسجيل الدخول وإرجاع توكن JWT' })
  @ApiBody({ type: LoginDto })
  @ApiSuccessResponse(Object, 'تم تسجيل الدخول بنجاح')
  @ApiUnauthorizedResponse({ description: 'بيانات الاعتماد غير صحيحة' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  @Public()
  @Post('resend-verification')
  @Throttle({ default: { ttl: 60, limit: 3 } }) // 3 requests per minute
  @ApiOperation({ summary: 'إعادة إرسال كود تفعيل البريد الإلكتروني' })
  @ApiOkResponse({ description: 'تم إرسال كود التفعيل بنجاح' })
  @ApiBadRequestResponse({
    description: 'خطأ في الطلب (بريد غير مسجل أو مفعل)',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto);
    return { message: 'تم إرسال كود التفعيل مجددًا إلى بريدك' };
  }
  // مسار التحقق من الكود
  @Public()
  @Post('verify-email')
  @Throttle({ default: { ttl: 60, limit: 5 } }) // 5 requests per minute
  @ApiOperation({ summary: 'تفعيل البريد برمز أو رابط' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: 'تم تفعيل البريد بنجاح' })
  @ApiUnauthorizedResponse({ description: 'رمز التفعيل غير صحيح أو منتهي' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60, limit: 3 } }) // 3 طلبات/دقيقة/IP
  async requestReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto);
    return { status: 'ok' }; // دائمًا ok
  }

  // (اختياري) لتجربة صحة الرابط قبل عرض صفحة إعادة التعيين
  @Get('reset-password/validate')
  @Throttle({ default: { ttl: 60, limit: 30 } })
  async validateToken(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    const ok = await this.authService.validatePasswordResetToken(email, token);
    return { valid: !!ok };
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60, limit: 10 } })
  async reset(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { status: 'ok' }; // لا نكشف أي تفاصيل
  }
  @Post('ensure-merchant')
  @UseGuards(JwtAuthGuard)
  async ensureMerchant(@Req() req: any) {
    return this.authService.ensureMerchant(req.user?.userId);
  }
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60, limit: 10 } })
  async change(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user?.userId, dto);
    return { status: 'ok' };
  }
}
