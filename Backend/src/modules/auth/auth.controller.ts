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
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CookieService } from './services/cookie.service';
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
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}
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
  @ApiOperation({
    summary: 'تسجيل الدخول وإرجاع access + refresh tokens مع كوكيز آمنة',
  })
  @ApiBody({ type: LoginDto })
  @ApiSuccessResponse(Object, 'تم تسجيل الدخول بنجاح')
  @ApiUnauthorizedResponse({ description: 'بيانات الاعتماد غير صحيحة' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    const result = await this.authService.login(loginDto, sessionInfo);

    // ✅ C4: تعيين كوكيز آمنة
    const accessTokenTTL = 15 * 60; // 15 minutes
    const refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days

    this.cookieService.setAccessTokenCookie(
      res,
      result.accessToken,
      accessTokenTTL,
    );
    this.cookieService.setRefreshTokenCookie(
      res,
      result.refreshToken,
      refreshTokenTTL,
    );

    return result;
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

  // ✅ C2: نقاط التحكم الجديدة للتوكنات
  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60, limit: 10 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'تدوير التوكنات باستخدام refresh token مع تحديث الكوكيز',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token (اختياري إذا كان في الكوكيز)',
        },
      },
    },
  })
  @ApiSuccessResponse(Object, 'تم تدوير التوكنات بنجاح')
  @ApiUnauthorizedResponse({ description: 'Refresh token غير صالح أو منتهي' })
  async refresh(
    @Body('refreshToken') bodyRefreshToken: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    // استخدام refresh token من الكوكيز أو من الـ body
    const refreshToken = bodyRefreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const result = await this.authService.refreshTokens(
      refreshToken,
      sessionInfo,
    );

    // ✅ C4: تحديث الكوكيز الآمنة
    const accessTokenTTL = 15 * 60; // 15 minutes
    const refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days

    this.cookieService.setAccessTokenCookie(
      res,
      result.accessToken,
      accessTokenTTL,
    );
    this.cookieService.setRefreshTokenCookie(
      res,
      result.refreshToken,
      refreshTokenTTL,
    );

    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'تسجيل الخروج - إبطال الجلسة الحالية وحذف الكوكيز' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token للإبطال (اختياري إذا كان في الكوكيز)',
        },
      },
    },
  })
  @ApiSuccessResponse(Object, 'تم تسجيل الخروج بنجاح')
  async logout(
    @Body('refreshToken') bodyRefreshToken: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // استخدام refresh token من الكوكيز أو من الـ body
    const refreshToken = bodyRefreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // ✅ C4: حذف الكوكيز الآمنة
    this.cookieService.clearAuthCookies(res);

    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'تسجيل الخروج من جميع الأجهزة وحذف الكوكيز' })
  @ApiSuccessResponse(Object, 'تم تسجيل الخروج من جميع الأجهزة بنجاح')
  async logoutAll(
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);

    // ✅ C4: حذف الكوكيز الآمنة
    this.cookieService.clearAuthCookies(res);

    return { message: 'تم تسجيل الخروج من جميع الأجهزة بنجاح' };
  }
}
