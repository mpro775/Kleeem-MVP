// ========== External imports ==========
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
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import { Public } from 'src/common/decorators/public.decorator';
// ========== Internal imports ==========
import { ErrorResponse } from 'src/common/dto/error-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { CurrentUser } from '../../common';
import { TranslationService } from '../../common/services/translation.service';

import { AuthService } from './auth.service';
import { AccessOnlyDto } from './dto/access-only.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { CookieService } from './services/cookie.service';

// ========== Type-only ==========
import type { JwtVerifyOptions } from '@nestjs/jwt';
import type { Request, Response } from 'express';

// ========== Constants ==========
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MINUTES_15 = 15 * SECONDS_PER_MINUTE; // 15m
const DAYS_7 = 7 * 24 * SECONDS_PER_MINUTE * 60; // 7d

// ========== Local DTOs (لطلبات بسيطة داخل هذا الكنترولر) ==========
export class RefreshRequestDto {
  @ApiPropertyOptional({
    description: 'Refresh token (optional if cookie set)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutRequestDto {
  @ApiPropertyOptional({
    description: 'Refresh token (optional if cookie set)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

// ========== Types & Guards ==========
interface JwtDecodedMinimal {
  sub?: string;
  jti?: string;
  exp?: number;
  [key: string]: unknown;
}

interface AuthUser {
  userId: string;
}

type AuthRequest = Request & {
  user?: AuthUser;
  cookies?: Record<string, unknown>;
  headers: Record<string, unknown>;
};

// ========== Safe helpers ==========
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getHeaderString(req: Request, name: string): string | null {
  const raw = (req.headers as Record<string, unknown>)[name];
  return typeof raw === 'string' ? raw : null;
}

function getCookieString(req: Request, name: string): string | null {
  const cookiesUnknown = (req as { cookies?: unknown }).cookies;
  if (!isRecord(cookiesUnknown)) return null;
  const val = cookiesUnknown[name];
  return typeof val === 'string' ? val : null;
}

function extractJti(decoded: unknown): string | null {
  if (!isRecord(decoded)) return null;
  const jti = decoded['jti'];
  return typeof jti === 'string' ? jti : null;
}

function extractSub(decoded: unknown): string | null {
  if (!isRecord(decoded)) return null;
  const sub = decoded['sub'];
  return typeof sub === 'string' ? sub : null;
}

// =================================== Controller ===================================
@ApiTags('i18n:auth.tags.authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly i18n: I18nService,
    private readonly jwtService: JwtService,
    private readonly translationService: TranslationService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Register ----------
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
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_REGISTER_TTL ?? '60', 10),
      limit: Number.parseInt(process.env.AUTH_REGISTER_LIMIT ?? '5', 10),
    },
  })
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
  async register(@Body() registerDto: RegisterDto): Promise<{
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  }> {
    const result = await this.authService.register(registerDto);
    return {
      ...result,
      user: {
        ...result.user,
        id: String(result.user.id),
      },
    };
  }

  // ---------- Login ----------
  @Public()
  @Post('login')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_LOGIN_TTL ?? '60', 10),
      limit: Number.parseInt(process.env.AUTH_LOGIN_LIMIT ?? '5', 10),
    },
  })
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
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  }> {
    const sessionInfo = this.buildSessionInfo(req);
    const result = await this.authService.login(loginDto, sessionInfo);
    const normalized = this.normalizeAuthResult(result);

    this.setAuthCookies(res, normalized.accessToken, normalized.refreshToken);
    await this.attachCsrfFromSession(res, normalized.refreshToken);

    return normalized;
  }

  // ---------- Resend verification ----------
  @Public()
  @Post('resend-verification')
  @Throttle({
    default: {
      ttl: Number.parseInt(
        process.env.AUTH_RESEND_VERIFICATION_TTL ?? '60',
        10,
      ),
      limit: Number.parseInt(
        process.env.AUTH_RESEND_VERIFICATION_LIMIT ?? '3',
        10,
      ),
    },
  })
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
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{
    message: string;
  }> {
    await this.authService.resendVerification(dto);
    return {
      message: this.translationService.translate(
        'auth.messages.verificationCodeResent',
      ),
    };
  }

  // ---------- Verify email ----------
  @Public()
  @Post('verify-email')
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_VERIFY_EMAIL_TTL ?? '60', 10),
      limit: Number.parseInt(process.env.AUTH_VERIFY_EMAIL_LIMIT ?? '5', 10),
    },
  })
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
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  }> {
    const result = await this.authService.verifyEmail(dto);
    return {
      ...result,
      user: {
        ...result.user,
        id: String(result.user.id),
      },
    };
  }

  // ---------- Request reset ----------
  @Public()
  @Post('forgot-password')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_FORGOT_PASSWORD_TTL ?? '300', 10),
      limit: Number.parseInt(process.env.AUTH_FORGOT_PASSWORD_LIMIT ?? '3', 10),
    },
  })
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_forgotPassword',
    summary: 'Request password reset link',
  })
  @ApiOkResponse({ description: 'Email sent if account exists' })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async requestReset(@Body() dto: RequestPasswordResetDto): Promise<{
    status: string;
    message: string;
  }> {
    await this.authService.requestPasswordReset(dto);
    return {
      status: 'ok',
      message: this.translationService.translate(
        'auth.messages.passwordResetRequested',
      ),
    };
  }

  // ---------- Validate reset token ----------
  @Get('reset-password/validate')
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_RESET_PASSWORD_TTL ?? '60', 10),
      limit: Number.parseInt(process.env.AUTH_RESET_PASSWORD_LIMIT ?? '30', 10),
    },
  })
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
  ): Promise<{ valid: boolean }> {
    const ok = await this.authService.validatePasswordResetToken(email, token);
    return { valid: Boolean(ok) };
  }

  // ---------- Reset password ----------
  @Public()
  @Post('reset-password')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_RESET_PASSWORD_TTL ?? '300', 10),
      limit: Number.parseInt(process.env.AUTH_RESET_PASSWORD_LIMIT ?? '5', 10),
    },
  })
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_resetPassword',
    summary: 'Reset password',
  })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async reset(@Body() dto: ResetPasswordDto): Promise<{
    status: string;
    message: string;
  }> {
    await this.authService.resetPassword(dto);
    return {
      status: 'ok',
      message: this.translationService.translate(
        'auth.messages.passwordResetSuccess',
      ),
    };
  }

  // ---------- Ensure merchant ----------
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
  async ensureMerchant(@CurrentUser('userId') userId: string): Promise<{
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  }> {
    const result = await this.authService.ensureMerchant(userId);
    return {
      ...result,
      user: {
        ...result.user,
        id: String(result.user.id),
        role: String(result.user.role),
        merchantId:
          result.user.merchantId != null
            ? String(result.user.merchantId)
            : null,
      },
    };
  }

  // ---------- Change password ----------
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_CHANGE_PASSWORD_TTL ?? '300', 10),
      limit: Number.parseInt(process.env.AUTH_CHANGE_PASSWORD_LIMIT ?? '5', 10),
    },
  })
  @ApiBearerAuth('bearer')
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_changePassword',
    summary: 'Change password',
  })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  async change(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{
    status: string;
    message: string;
  }> {
    await this.authService.changePassword(userId, dto);
    return {
      status: 'ok',
      message: this.translationService.translate(
        'auth.messages.passwordChangeSuccess',
      ),
    };
  }

  // ---------- Refresh ----------
  @Public()
  @Post('refresh')
  @Throttle({
    default: {
      ttl: Number.parseInt(process.env.AUTH_REFRESH_TTL ?? '60', 10),
      limit: Number.parseInt(process.env.AUTH_REFRESH_LIMIT ?? '10', 10),
    },
  })
  @ApiSecurity('csrf')
  @ApiOperation({
    operationId: 'auth_refresh',
    summary: 'i18n:auth.operations.refreshToken.summary',
    description: 'i18n:auth.operations.refreshToken.description',
  })
  @ApiBody({ type: RefreshRequestDto })
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
    @Body() dto: RefreshRequestDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  }> {
    const sessionInfo = this.buildSessionInfo(req);
    this.assertValidCsrf(req);

    const refreshToken =
      dto.refreshToken ?? getCookieString(req, 'refreshToken');
    if (!refreshToken) {
      throw new UnauthorizedException(
        this.translationService.translate(
          'auth.errors.refreshTokenNotProvided',
        ),
      );
    }

    const raw = await this.authService.refreshTokens(refreshToken, sessionInfo);
    const result = this.normalizeAuthResult(
      raw as {
        accessToken: string;
        refreshToken: string;
        user: {
          id: unknown;
          name: string;
          email: string;
          role: unknown;
          merchantId: unknown;
          firstLogin: boolean;
          emailVerified: boolean;
        };
      },
    );

    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    await this.attachCsrfFromSession(res, result.refreshToken);

    return result;
  }

  // ---------- Logout ----------
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiSecurity('csrf')
  @ApiOperation({
    summary: 'i18n:auth.operations.logout.summary',
    description: 'i18n:auth.operations.logout.description',
  })
  @ApiBody({ type: LogoutRequestDto })
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
    @Body() dto: LogoutRequestDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    message: string;
  }> {
    const refreshToken =
      dto.refreshToken ?? getCookieString(req, 'refreshToken');
    const userId = req.user?.userId ?? null;

    if (refreshToken) {
      this.validateRefreshTokenOwnership(refreshToken, userId);
      await this.authService.logout(refreshToken);
    }

    await this.blacklistAccessTokenIfPresent(req);
    this.cookieService.clearAuthCookies(res);

    return {
      message: this.translationService.translate('auth.messages.logoutSuccess'),
    };
  }

  // ---------- Logout all ----------
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
  ): Promise<{
    message: string;
  }> {
    await this.authService.logoutAll(userId);
    this.cookieService.clearAuthCookies(res);
    return {
      message: this.translationService.translate(
        'auth.messages.logoutAllSuccess',
      ),
    };
  }
  private buildSessionInfo(req: AuthRequest): {
    userAgent?: string;
    ip: string;
  } {
    return {
      userAgent: getHeaderString(req, 'user-agent') ?? '',
      ip: req.ip ?? '',
    };
  }

  private assertValidCsrf(req: AuthRequest): void {
    const csrfFromHeader = getHeaderString(req, 'x-csrf-token');
    const csrfFromCookie = getCookieString(req, 'csrf-token');
    if (
      !csrfFromHeader ||
      !csrfFromCookie ||
      csrfFromHeader !== csrfFromCookie
    ) {
      throw new UnauthorizedException(
        this.translationService.translate('auth.errors.csrfTokenInvalid'),
      );
    }
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const accessTtl = Number.parseInt(
      this.config.get<string>('AUTH_ACCESS_COOKIE_TTL') ?? `${MINUTES_15}`,
      10,
    );
    const refreshTtl = Number.parseInt(
      this.config.get<string>('AUTH_REFRESH_COOKIE_TTL') ?? `${DAYS_7}`,
      10,
    );
    this.cookieService.setAccessTokenCookie(res, accessToken, accessTtl);
    this.cookieService.setRefreshTokenCookie(res, refreshToken, refreshTtl);
  }

  private async attachCsrfFromSession(
    res: Response,
    refreshToken: string,
  ): Promise<void> {
    const decodedUnknown: unknown = this.jwtService.decode(refreshToken);
    const jti = extractJti(decodedUnknown);
    if (!jti) return;
    const csrfToken = await this.authService.getSessionCsrfToken(jti);
    if (csrfToken) {
      this.cookieService.setSecureCookie(res, 'csrf-token', csrfToken);
      res.setHeader('X-CSRF-Token', csrfToken);
    }
  }

  private normalizeAuthResult(result: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: unknown;
      name: string;
      email: string;
      role: unknown;
      merchantId: unknown;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  }): {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
    };
  } {
    return {
      ...result,
      user: {
        ...result.user,
        id: String(result.user.id),
        role: String(result.user.role),
        merchantId:
          result.user.merchantId != null
            ? String(result.user.merchantId as string)
            : null,
      },
    };
  }

  private validateRefreshTokenOwnership(
    refreshToken: string,
    userId: string | null,
  ): void {
    const verifyOptions: JwtVerifyOptions = {
      secret: this.config.get<string>('JWT_SECRET') ?? '',
      issuer: this.config.get<string>('JWT_ISSUER') ?? '',
      audience: this.config.get<string>('JWT_AUDIENCE') ?? '',
    };
    const decoded = this.jwtService.verify<JwtDecodedMinimal>(
      refreshToken,
      verifyOptions,
    );

    const sub = extractSub(decoded);
    if (!sub || !userId || sub !== userId) {
      throw new UnauthorizedException('Invalid token owner');
    }
  }

  private async blacklistAccessTokenIfPresent(req: AuthRequest): Promise<void> {
    const authHeader = getHeaderString(req, 'authorization');
    if (!authHeader?.startsWith('Bearer ')) return;

    const access = authHeader.slice(7);
    try {
      const verifyOptions: JwtVerifyOptions = {
        secret: this.config.get<string>('JWT_SECRET') ?? '',
        issuer: this.config.get<string>('JWT_ISSUER') ?? '',
        audience: this.config.get<string>('JWT_AUDIENCE') ?? '',
      };
      const decoded = this.jwtService.verify<JwtDecodedMinimal>(
        access,
        verifyOptions,
      );
      const now = Math.floor(Date.now() / MS_PER_SECOND);
      const exp = typeof decoded.exp === 'number' ? decoded.exp : now;
      const jti = extractJti(decoded);
      if (jti) {
        const ttlSec = Math.max(1, exp - now);
        await this.authService
          .getTokenService()
          .blacklistAccessJti(jti, ttlSec);
      }
    } catch {
      // نتجاهل أخطاء التحقق من الـ access token أثناء تسجيل الخروج
    }
  }
}
