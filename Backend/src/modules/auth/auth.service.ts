import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import { PlanTier } from '../merchants/schemas/subscription-plan.schema';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private readonly jwtService: JwtService,
    private readonly merchants: MerchantsService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { password, confirmPassword, email, name } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('كلمتا المرور غير متطابقتين');
    }
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('Email already in use');
    }

    let userDoc: UserDocument | null = null;
    let merchantDoc: MerchantDocument | null = null;

    try {
      // 1) إنشاء المستخدم
      userDoc = await new this.userModel({
        name,
        email,
        password, // pre-save يعمل الهاش
        role: 'MERCHANT',
        firstLogin: true,
      }).save();

      // 2) كود التفعيل
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      userDoc.emailVerificationCode = code;
      userDoc.emailVerificationExpiresAt = new Date(
        Date.now() + 15 * 60 * 1000,
      );
      await userDoc.save();

      // 3) إنشاء التاجر عبر MerchantsService.create (هذا ينشئ الـ workflow + storefront + finalPromptTemplate)
      merchantDoc = await this.merchants.create({
        userId: String(userDoc._id),
        name: `متجر ${name}`,
        addresses: [],
        subscription: {
          tier: PlanTier.Free,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          features: [
            'basic_support',
            'chat_bot',
            'analytics',
            'multi_channel',
            'api_access',
            'webhook_integration',
          ],
        },
        categories: [],
        quickConfig: {
          dialect: 'خليجي',
          tone: 'ودّي',
          customInstructions: [],
          sectionOrder: ['products', 'policies', 'custom'],
          includeStoreUrl: true,
          includeAddress: true,
          includePolicies: true,
          includeWorkingHours: true,
          includeClosingPhrase: true,
          closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
        },
        currentAdvancedConfig: {
          template: '',
          updatedAt: new Date(),
          note: '',
        },
        advancedConfigHistory: [],
        returnPolicy: '',
        exchangePolicy: '',
        shippingPolicy: '',
        // channels تُترك فارغة هنا، ويتم ضبطها لاحقاً حسب الحاجة
      } as any); // إن كان DTO صارم جداً، أبقه مطابقًا لتعريفك

      // 4) ربط user ↔ merchant
      userDoc.merchantId = merchantDoc._id as Types.ObjectId;
      await userDoc.save();

      // 5) إرسال الإيميل بعد نجاح كل شيء
      this.mailService
        .sendVerificationEmail(email, code)
        .catch((err) =>
          this.logger.error('Failed sending verification email', err),
        );

      // 6) JWT
      const payload = {
        userId: userDoc._id,
        role: userDoc.role,
        merchantId: userDoc.merchantId,
      };
      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: userDoc._id,
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role,
          merchantId: userDoc.merchantId,
          firstLogin: userDoc.firstLogin,
          emailVerified: userDoc.emailVerified,
        },
      };
    } catch (err: any) {
      // تعويض منطقي: لو أنشأنا Merchant أو User احذفهم
      try {
        if (merchantDoc?._id) {
          await this.merchantModel.findByIdAndDelete(merchantDoc._id).exec();
        }
        if (userDoc?._id) {
          await this.userModel.findByIdAndDelete(userDoc._id).exec();
        }
      } catch (cleanupErr) {
        this.logger.error('Cleanup after register failed', cleanupErr);
      }
      this.logger.error('Register failed', err?.stack || err);
      throw new InternalServerErrorException('Failed to register');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const userDoc = await this.userModel.findOne({ email }).select('+password');
    if (!userDoc) throw new BadRequestException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) throw new BadRequestException('Invalid credentials');

    const merchant = await this.merchantModel.findOne({ userId: userDoc._id });

    const payload = {
      userId: userDoc._id,
      role: userDoc.role,
      merchantId: merchant?._id || null,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        merchantId: merchant?._id || null,
        firstLogin: userDoc.firstLogin,
        emailVerified: userDoc.emailVerified, // 👈 جديد
      },
    };
  }
  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const { email, code } = dto;
    const user = await this.userModel
      .findOne({ email, emailVerificationCode: code })
      .exec();
    if (!user) throw new BadRequestException('رمز التفعيل غير صحيح');

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('رمز التفعيل منتهي الصلاحية');
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiresAt = undefined;
    user.firstLogin = false;
    await user.save();
  }
  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const { email } = dto;

    // 1) ابحث عن المستخدم
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new BadRequestException('البريد الإلكتروني غير مسجل');
    }

    // 2) إذا كان مفعلًا بالفعل، لا حاجة للإرسال
    if (user.emailVerified) {
      throw new BadRequestException('البريد الإلكتروني مُفعّل مسبقًا');
    }

    // 3) أنشئ كود جديد وصلاحيته
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = code;
    user.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // 4) أرسل الإيميل (إذا فشل لا تُفشل الطلب)
    try {
      await this.mailService.sendVerificationEmail(email, code);
    } catch (err) {
      this.logger.error('Failed sending verification email', err);
    }
  }
}
