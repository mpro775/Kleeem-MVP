import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { Types } from 'mongoose';

import { CACHE_TTL_5_MINUTES } from '../../common/cache/constant';
import {
  PASSWORD_RESET_TOKEN_LENGTH,
  RESEND_VERIFICATION_WINDOW_MS,
  PASSWORD_RESET_WINDOW_MS,
  SECONDS_PER_HOUR,
} from '../../common/constants/common';
import { DUPLICATE_KEY_CODE } from '../../common/filters/constants';
import { TranslationService } from '../../common/services/translation.service';
import { BusinessMetrics } from '../../metrics/business.metrics';
import { MailService } from '../mail/mail.service';
import { MerchantsService } from '../merchants/merchants.service';
import { MerchantDocument } from '../merchants/schemas/merchant.schema';
import { UserDocument } from '../users/schemas/user.schema';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthRepository } from './repositories/auth.repository';
import { TokenService } from './services/token.service';
import { toStr } from './utils/id';
import { generateSecureToken } from './utils/password-reset';
import {
  generateNumericCode,
  minutesFromNow,
  sha256,
} from './utils/verification-code';

import type { TokenPair } from './services/token.service';

// ========== Local Types ==========
interface MongoDuplicateKeyError {
  code: number;
  keyPattern: Record<string, number>;
}
// ===== حارس/محوّل آمن للتواريخ من مستند Mongoose =====
function toEpochMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

// إن لم تكن لديك بالفعل:
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}
function extractJti(decoded: unknown): string | null {
  return isRecord(decoded) && typeof decoded.jti === 'string'
    ? decoded.jti
    : null;
}
const VERIFICATION_CODE_LENGTH = 6;
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('AuthRepository') private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly merchants: MerchantsService,
    private readonly mailService: MailService,
    private readonly businessMetrics: BusinessMetrics,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly translationService: TranslationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async register(registerDto: RegisterDto): Promise<{
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
    this.validateRegistrationData(registerDto);

    try {
      const result = await this.createUserWithVerification(registerDto);
      await this.sendVerificationEmailSafely(
        registerDto.email,
        result.verificationCode,
      );

      return this.buildRegistrationResponse(result.userDoc);
    } catch (err: unknown) {
      this.handleRegistrationError(err);
    }
  }

  private validateRegistrationData(dto: RegisterDto): void {
    const { password, confirmPassword } = dto;
    if (password !== confirmPassword) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.passwordMismatch'),
      );
    }
  }

  private async createUserWithVerification(
    dto: RegisterDto,
  ): Promise<{ userDoc: UserDocument; verificationCode: string }> {
    const { password, email, name } = dto;

    const userDoc = await this.repo.createUser({
      name: name || '',
      email,
      password: password || '',
      role: 'MERCHANT',
      active: true,
      firstLogin: true,
      emailVerified: false,
    });

    const code = generateNumericCode(VERIFICATION_CODE_LENGTH);
    await this.repo.createEmailVerificationToken({
      userId: userDoc._id,
      codeHash: sha256(code),
      expiresAt: minutesFromNow(15),
    });

    return { userDoc, verificationCode: code };
  }

  private async sendVerificationEmailSafely(
    email: string,
    verificationCode: string,
  ): Promise<void> {
    try {
      await this.mailService.sendVerificationEmail(
        email || '',
        verificationCode,
      );
      this.businessMetrics.incEmailSent();
    } catch {
      this.businessMetrics.incEmailFailed();
    }
  }

  private buildRegistrationResponse(userDoc: UserDocument): {
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
  } {
    const { accessToken } = this.tokenService.createAccessOnly({
      userId: String(userDoc._id),
      role: userDoc.role ?? 'MERCHANT',
      merchantId: null,
    });

    return {
      accessToken,
      user: {
        id: String(userDoc._id),
        name: userDoc.name || '',
        email: userDoc.email || '',
        role: userDoc.role || 'MERCHANT',
        merchantId: null,
        firstLogin: userDoc.firstLogin ?? true,
        emailVerified: userDoc.emailVerified ?? false,
      },
    };
  }

  private handleRegistrationError(err: unknown): never {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      'keyPattern' in err &&
      (err as MongoDuplicateKeyError).code === DUPLICATE_KEY_CODE &&
      (err as MongoDuplicateKeyError).keyPattern?.email
    ) {
      throw new ConflictException(
        this.translationService.translate('auth.errors.emailAlreadyExists'),
      );
    }
    this.logger.error('Registration failed', err);
    throw new InternalServerErrorException(
      this.translationService.translate('auth.errors.registrationFailed'),
    );
  }

  async login(
    loginDto: LoginDto,
    sessionInfo?: { userAgent?: string; ip?: string },
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
    const { email, password } = loginDto;
    const userDoc = await this.repo.findUserByEmailWithPassword(email || '');

    const validatedUser = await this.validateUserLogin(userDoc, password);
    await this.validateMerchantStatus(validatedUser);

    const tokens = await this.tokenService.createTokenPair(
      {
        userId: String(validatedUser._id),
        role: validatedUser.role,
        merchantId: validatedUser.merchantId
          ? String(validatedUser.merchantId)
          : null,
      },
      sessionInfo,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: String(validatedUser._id),
        name: validatedUser.name || '',
        email: validatedUser.email || '',
        role: validatedUser.role || 'MERCHANT',
        merchantId: validatedUser.merchantId
          ? String(validatedUser.merchantId)
          : null,
        firstLogin: validatedUser.firstLogin ?? true,
        emailVerified: validatedUser.emailVerified ?? false,
      },
    };
  }

  private async validateUserLogin(
    userDoc: UserDocument | null,
    password: string,
  ): Promise<UserDocument> {
    if (!userDoc) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.invalidCredentials'),
      );
    }

    if (userDoc.active === false) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.accountDisabled'),
      );
    }

    const isMatch = await bcrypt.compare(
      password || '',
      userDoc.password ?? '',
    );
    if (!isMatch) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.invalidCredentials'),
      );
    }

    if (!userDoc.emailVerified) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.emailNotVerified'),
      );
    }

    return userDoc;
  }

  private async validateMerchantStatus(userDoc: UserDocument): Promise<void> {
    if (userDoc.merchantId && String(userDoc.role) !== 'ADMIN') {
      const merchant = await this.repo.findMerchantBasicById(
        userDoc.merchantId as unknown as string,
      );
      if (
        merchant &&
        (merchant.active === false || (merchant as MerchantDocument).deletedAt)
      ) {
        throw new BadRequestException(
          this.translationService.translate(
            'auth.errors.merchantAccountSuspended',
          ),
        );
      }
    }
  }

  async refreshTokens(
    refreshToken: string,
    sessionInfo?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    return this.tokenService.refreshTokens(refreshToken, sessionInfo);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      const decodedUnknown: unknown = this.jwtService.decode(refreshToken);
      const jti = extractJti(decodedUnknown);
      if (jti) {
        await this.tokenService.revokeRefreshToken(jti);
      }
      return { message: 'تم تسجيل الخروج بنجاح' };
    } catch {
      return {
        message: this.translationService.translate(
          'auth.messages.logoutSuccess',
        ),
      };
    }
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.tokenService.revokeAllUserSessions(userId);
    return {
      message: this.translationService.translate(
        'auth.messages.logoutAllSuccess',
      ),
    };
  }

  getTokenService(): TokenService {
    return this.tokenService;
  }

  async getSessionCsrfToken(jti: string): Promise<string | null> {
    return this.tokenService.getSessionCsrfToken(jti);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{
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
    const { email, code } = dto;
    const user = await this.validateVerificationRequest(email, code);

    await this.updateUserAfterVerification(user);
    await this.ensureUserMerchant(user);
    await this.cleanupVerificationTokens(user);

    return this.buildVerificationResponse(user);
  }

  private async validateVerificationRequest(
    email: string,
    code: string,
  ): Promise<UserDocument> {
    const user = await this.repo.findUserByEmailWithPassword(email || '');
    if (!user) {
      throw new BadRequestException(
        this.translationService.translate(
          'auth.errors.invalidVerificationCode',
        ),
      );
    }

    const tokenDoc = await this.repo.latestEmailVerificationTokenByUser(
      user._id,
    );
    if (!tokenDoc || tokenDoc.codeHash !== sha256(code || '')) {
      throw new BadRequestException(
        this.translationService.translate(
          'auth.errors.invalidVerificationCode',
        ),
      );
    }
    if (!tokenDoc.expiresAt || tokenDoc.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        this.translationService.translate(
          'auth.errors.verificationCodeExpired',
        ),
      );
    }

    return user;
  }

  private async updateUserAfterVerification(user: UserDocument): Promise<void> {
    user.emailVerified = true;
    user.firstLogin = true;
    await this.repo.saveUser(user);

    // Invalidate cache after user update
    await this.invalidateUserCache(user.email || '', String(user._id));
  }

  private async ensureUserMerchant(user: UserDocument): Promise<void> {
    const merchant = await this.merchants.ensureForUser(user._id, {
      name: user.name ?? '',
    });

    if (!user.merchantId) {
      user.merchantId = merchant._id as Types.ObjectId;
      await this.repo.saveUser(user);
    }
  }

  private async cleanupVerificationTokens(user: UserDocument): Promise<void> {
    await this.repo.deleteEmailVerificationTokensByUser(user._id);
  }

  private buildVerificationResponse(user: UserDocument): {
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
  } {
    const { accessToken } = this.tokenService.createAccessOnly({
      userId: String(user._id),
      role: user.role ?? 'MERCHANT',
      merchantId: user.merchantId ? String(user.merchantId) : null,
    });

    return {
      accessToken,
      user: {
        id: String(user._id),
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'MERCHANT',
        merchantId: toStr(user.merchantId),
        firstLogin: true,
        emailVerified: true,
      },
    };
  }

  // Cached user lookup with TTL of 5 minutes
  private async findUserByEmail(email: string) {
    const cacheKey = `user:email:${email}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.repo.findUserByEmailWithPassword(email);
    if (user) {
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, user, CACHE_TTL_5_MINUTES); // ✅ 5 دقائق بالملّي ثانية
    }
    return user;
  }

  // Cache invalidation helper
  private async invalidateUserCache(email: string, userId?: string) {
    const promises = [this.cacheManager.del(`user:email:${email}`)];
    if (userId) {
      promises.push(this.cacheManager.del(`user:id:${userId}`));
    }
    await Promise.all(promises);
  }

  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const { email } = dto;
    const user = await this.findUserByEmail(email || '');
    if (!user) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.emailNotRegistered'),
      );
    }
    if ((user as UserDocument).emailVerified) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.emailAlreadyVerified'),
      );
    }

    const recent = await this.repo.latestEmailVerificationTokenByUser(
      (user as UserDocument)._id,
    );

    if (recent) {
      // createdAt قد لا يكون معرفًا في النوع؛ نقرأه عبر get أو الحقل المباشر ثم نحوّله بأمان
      const createdRaw =
        typeof (recent as { get?: (k: string) => unknown }).get === 'function'
          ? (recent as { get: (k: string) => unknown }).get('createdAt')
          : (recent as unknown as Record<string, unknown>).createdAt;

      const createdAtMs = toEpochMs(createdRaw);
      if (
        createdAtMs !== null &&
        Date.now() - createdAtMs < RESEND_VERIFICATION_WINDOW_MS
      ) {
        return;
      }
    }

    const code = generateNumericCode(VERIFICATION_CODE_LENGTH);
    await this.repo.createEmailVerificationToken({
      userId: (user as UserDocument)._id,
      codeHash: sha256(code),
      expiresAt: minutesFromNow(15),
    });

    try {
      await this.mailService.sendVerificationEmail(email || '', code);
    } catch (e: unknown) {
      this.logger.error('Failed to send verification email', e);
    }
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<void> {
    const { email } = dto;
    const user = await this.repo.findUserByEmailSelectId(email || '');
    if (!user) return;

    const last = await this.repo.latestPasswordResetTokenByUser(user._id, true);
    if (last) {
      const createdRaw =
        typeof (last as { get?: (k: string) => unknown }).get === 'function'
          ? (last as { get: (k: string) => unknown }).get('createdAt')
          : (last as unknown as Record<string, unknown>).createdAt;

      const createdAtMs = toEpochMs(createdRaw);
      if (
        createdAtMs !== null &&
        Date.now() - createdAtMs < PASSWORD_RESET_WINDOW_MS
      ) {
        return;
      }
    }

    const token = generateSecureToken(PASSWORD_RESET_TOKEN_LENGTH);
    const tokenHash = sha256(token);

    await this.repo.createPasswordResetToken({
      userId: user._id,
      tokenHash,
      expiresAt: minutesFromNow(30),
    });

    const base = (this.config.get<string>('FRONTEND_URL') ?? '').replace(
      /\/+$/,
      '',
    );
    const link = `${base}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email || '')}`;

    await this.mailService.sendPasswordResetEmail(email || '', link);
    this.businessMetrics.incEmailSent?.();
  }

  async validatePasswordResetToken(
    email: string,
    token: string,
  ): Promise<boolean> {
    const u = await this.repo.findUserByEmailSelectId(email || '');
    if (!u) return false;
    const doc = await this.repo.findLatestPasswordResetForUser(u._id, true);
    if (!doc) return false;
    if (!doc.expiresAt || doc.expiresAt.getTime() < Date.now()) return false;
    return doc.tokenHash === sha256(token);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { email, token, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.passwordMismatch'),
      );
    }

    const user = await this.repo.findUserByEmailWithPassword(email || '');
    if (!user) return;

    const doc = await this.repo.latestPasswordResetTokenByUser(user._id, true);
    if (!doc) return;
    if (!doc.expiresAt || doc.expiresAt.getTime() < Date.now()) return;

    const ok = doc.tokenHash === sha256(token || '');
    if (!ok) return;

    user.password = newPassword || '';
    user.passwordChangedAt = new Date();
    await this.repo.saveUser(user);

    // Invalidate cache after password change
    await this.invalidateUserCache(user.email ?? '', String(user._id));

    await this.repo.markPasswordResetTokenUsed(doc._id);
    await this.repo.deleteOtherPasswordResetTokens(user._id, doc._id);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = dto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.passwordMismatch'),
      );
    }

    const user = await this.repo.findUserByIdWithPassword(userId);
    if (!user) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.userNotFound'),
      );
    }

    const match = await bcrypt.compare(
      currentPassword || '',
      user.password ?? '',
    );
    if (!match) {
      throw new BadRequestException(
        this.translationService.translate(
          'auth.errors.currentPasswordIncorrect',
        ),
      );
    }

    user.password = newPassword || '';
    user.passwordChangedAt = new Date();
    await this.repo.saveUser(user);

    // Invalidate cache after password change
    await this.invalidateUserCache(user.email ?? '', String(user._id));
    await this.cacheManager.set(
      `pwdChangedAt:${user._id.toString()}`,
      user.passwordChangedAt.getTime(),
      30 * 24 * SECONDS_PER_HOUR, // ✅ 30 يوم بالملّي ثانية
    );

    await this.repo.deletePasswordResetTokensByUser(user._id);

    this.businessMetrics.incPasswordChangeCompleted?.();
  }

  async ensureMerchant(userId: string): Promise<{
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
      active: boolean;
    };
  }> {
    const user = await this.validateUserExists(userId);

    if (user.merchantId) {
      await this.validateExistingMerchant(user.merchantId);
    } else {
      await this.createMerchantForUser(user);
    }

    return this.buildMerchantResponse(user);
  }

  private async validateUserExists(userId: string): Promise<UserDocument> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.userNotFound'),
      );
    }
    return user;
  }

  private async validateExistingMerchant(
    merchantId: Types.ObjectId,
  ): Promise<void> {
    const merchant = await this.repo.findMerchantBasicById(
      merchantId as unknown as string,
    );
    if (!merchant) throw new BadRequestException('Merchant not found');
    if (
      (merchant as MerchantDocument).deletedAt ||
      (merchant as MerchantDocument).active === false
    ) {
      throw new BadRequestException('تم إيقاف حساب التاجر مؤقتًا');
    }
  }

  private async createMerchantForUser(user: UserDocument): Promise<void> {
    if (!user.emailVerified) {
      throw new BadRequestException(
        this.translationService.translate('auth.errors.emailNotVerified'),
      );
    }

    const merchant = await this.merchants.ensureForUser(user._id, {
      name: user.name || '',
    });

    if (!user.merchantId) {
      user.merchantId = merchant._id as Types.ObjectId;
      await this.repo.saveUser(user);
    }
  }

  private buildMerchantResponse(user: UserDocument): {
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      merchantId: string | null;
      firstLogin: boolean;
      emailVerified: boolean;
      active: boolean;
    };
  } {
    const { accessToken } = this.tokenService.createAccessOnly({
      userId: String(user._id),
      role: (user.role || 'MERCHANT') as 'MERCHANT' | 'ADMIN' | 'MEMBER',
      merchantId: user.merchantId ? String(user.merchantId) : null,
    });

    return {
      accessToken,
      user: {
        id: String(user._id),
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'MERCHANT',
        merchantId: user.merchantId ? String(user.merchantId) : null,
        firstLogin: user.firstLogin ?? true,
        emailVerified: user.emailVerified ?? false,
        active: user.active ?? true,
      },
    };
  }
}
