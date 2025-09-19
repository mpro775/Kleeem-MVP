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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
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
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from '../../common';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TranslationService } from '../../common/services/translation.service';
import { JwtService } from '@nestjs/jwt';
import { ErrorResponse } from 'src/common/dto/error-response.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { AccessOnlyDto } from './dto/access-only.dto';

@ApiTags('i18n:auth.tags.authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly i18n: I18nService,
    private readonly jwtService: JwtService, // ✅ أضف هذا
    private readonly translationService: TranslationService,
  ) {}
  @Public()
  @Post('register')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  @Throttle({ default: { ttl: 60, limit: 5 } }) // 5 requests per minute
  @ApiOperation({
    operationId: 'auth_register',
    summary: 'i18n:auth.operations.register.summary',
    description: 'i18n:auth.operations.register.description',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'i18n:auth.messages.registerSuccess',
    type: AccessOnlyDto,
    examples: {
      success: {
        summary: 'Registration successful',
        value: {
          accessToken: 'eyJ...',
          user: {
            id: '66f...',
            name: 'أحمد',
            email: 'user@example.com',
            role: 'MERCHANT',
            merchantId: null,
            firstLogin: true,
            emailVerified: false,
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'i18n:auth.errors.registrationFailed',
    type: ErrorResponse,
    examples: {
      emailExists: {
        summary: 'Email already exists',
        value: { code: 'DUPLICATE', message: 'البريد مستخدم مسبقاً' },
      },
      invalid: {
        summary: 'Validation error',
        value: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: ['email must be an email'],
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    type: ErrorResponse,
    description: 'Too many attempts',
  })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({ default: { ttl: 60, limit: 5 } }) // 5 requests per minute
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_login',
    summary: 'i18n:auth.operations.login.summary',
    description: 'i18n:auth.operations.login.description',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'i18n:auth.messages.loginSuccess',
    type: TokenPairDto,
    headers: {
      'Set-Cookie': {
        description: 'HttpOnly secure cookies: accessToken, refreshToken',
        schema: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.invalidCredentials',
    type: ErrorResponse,
  })
  @ApiTooManyRequestsResponse({ type: ErrorResponse })
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
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_resendVerification',
    summary: 'i18n:auth.operations.resendVerification.summary',
    description: 'i18n:auth.operations.resendVerification.description',
  })
  @ApiOkResponse({ description: 'i18n:auth.messages.verificationEmailSent' })
  @ApiBadRequestResponse({
    description: 'i18n:auth.errors.resendVerificationFailed',
    type: ErrorResponse,
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto);
    return {
      message: this.translationService.translate(
        'auth.messages.verificationCodeResent',
      ),
    };
  }
  // مسار التحقق من الكود
  @Public()
  @Post('verify-email')
  @Throttle({ default: { ttl: 60, limit: 5 } }) // 5 requests per minute
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_verifyEmail',
    summary: 'i18n:auth.operations.verifyEmail.summary',
    description: 'i18n:auth.operations.verifyEmail.description',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({
    description: 'i18n:auth.messages.emailVerified',
    type: AccessOnlyDto,
  })
  @ApiBadRequestResponse({
    description: 'i18n:auth.errors.invalidVerificationCode',
    type: ErrorResponse,
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }
  @Public()
  @Post('forgot-password')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({ default: { ttl: 300, limit: 3 } }) // 3 requests per 5 minutes per IP
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_forgotPassword',
    summary: 'Request password reset link',
  })
  @ApiOkResponse({ description: 'Email sent if account exists' })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async requestReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto);
    return {
      status: 'ok',
      message: this.translationService.translate(
        'auth.messages.passwordResetRequested',
      ),
    };
  }

  // (اختياري) لتجربة صحة الرابط قبل عرض صفحة إعادة التعيين
  @Get('reset-password/validate')
  @Throttle({ default: { ttl: 60, limit: 30 } })
  @ApiOperation({
    operationId: 'auth_validateResetToken',
    summary: 'Validate reset token',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { valid: { type: 'boolean', example: true } },
    },
  })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async validateToken(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    const ok = await this.authService.validatePasswordResetToken(email, token);
    return { valid: !!ok };
  }

  @Public()
  @Post('reset-password')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({ default: { ttl: 300, limit: 5 } }) // 5 requests per 5 minutes
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_resetPassword',
    summary: 'Reset password',
  })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async reset(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return {
      status: 'ok',
      message: this.translationService.translate(
        'auth.messages.passwordResetSuccess',
      ),
    };
  }
  @Post('ensure-merchant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'auth_ensureMerchant',
    summary: 'Ensure merchant exists',
    description: 'Creates merchant for user if missing (P95 ≤ 500ms)',
  })
  @ApiOkResponse({ type: AccessOnlyDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  async ensureMerchant(@Req() req: any) {
    return this.authService.ensureMerchant(req.user?.userId);
  }
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({ default: { ttl: 300, limit: 5 } }) // 5 requests per 5 minutes
  @ApiBearerAuth('bearer')
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_changePassword',
    summary: 'Change password',
  })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  async change(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user?.userId, dto);
    return {
      status: 'ok',
      message: this.translationService.translate(
        'auth.messages.passwordChangeSuccess',
      ),
    };
  }

  // ✅ C2: نقاط التحكم الجديدة للتوكنات
  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60, limit: 10 } }) // 10 requests per minute
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_refresh',
    summary: 'i18n:auth.operations.refreshToken.summary',
    description: 'i18n:auth.operations.refreshToken.description',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'i18n:auth.fields.refreshToken',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'i18n:auth.messages.tokenRefreshed',
    type: TokenPairDto,
    headers: {
      'Set-Cookie': {
        description: 'Updates refreshToken; HttpOnly, SameSite, Secure',
        schema: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.refreshTokenInvalid',
    type: ErrorResponse,
  })
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
      throw new UnauthorizedException(
        this.translationService.translate(
          'auth.errors.refreshTokenNotProvided',
        ),
      );
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
  @ApiBearerAuth('bearer')
  @ApiSecurity('csrf')
  @ApiOperation({
    summary: 'i18n:auth.operations.logout.summary',
    description: 'i18n:auth.operations.logout.description',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'i18n:auth.fields.refreshToken',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'i18n:auth.messages.logoutSuccess',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'تم تسجيل الخروج بنجاح' },
      },
    },
    headers: {
      'Set-Cookie': {
        description: 'Clears auth cookies',
        schema: { type: 'string' },
      },
    },
  })
  async logout(
    @Body('refreshToken') bodyRefreshToken: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // استخدام refresh token من الكوكيز أو من الـ body
    const refreshToken = bodyRefreshToken || req.cookies?.refreshToken;
    const me = req.user?.userId;
    if (refreshToken) {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });
      if (decoded?.sub !== me) {
        throw new UnauthorizedException('Invalid token owner');
      }
      await this.authService.logout(refreshToken);
    }
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const access = authHeader.slice(7);
      try {
        const decoded: any = this.jwtService.verify(access, {
          secret: process.env.JWT_SECRET,
        });
        if (decoded?.jti) {
          // خزّنه في blacklist لمدة ما تبقى من عمره
          const now = Math.floor(Date.now() / 1000);
          const ttlSec = Math.max(1, (decoded.exp || now) - now);
          await this.authService['tokenService']['store'].addToBlacklist(
            decoded.jti,
            ttlSec,
          );
        }
      } catch {
        /* تجاهل */
      }
    }
    // ✅ C4: حذف الكوكيز الآمنة
    this.cookieService.clearAuthCookies(res);

    return {
      message: this.translationService.translate('auth.messages.logoutSuccess'),
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiSecurity('csrf')
  @ApiOperation({
    summary: 'i18n:auth.operations.logoutAll.summary',
    description: 'i18n:auth.operations.logoutAll.description',
  })
  @ApiOkResponse({
    description: 'i18n:auth.messages.logoutAllSuccess',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'تم تسجيل الخروج من كل الجلسات' },
      },
    },
  })
  async logoutAll(
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);

    // ✅ C4: حذف الكوكيز الآمنة
    this.cookieService.clearAuthCookies(res);

    return {
      message: this.translationService.translate(
        'auth.messages.logoutAllSuccess',
      ),
    };
  }
}
