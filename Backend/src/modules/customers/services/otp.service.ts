// src/modules/customers/services/otp.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SmsService } from '../../../common/services/sms.service';
import { normalizePhone } from '../../../common/utils/phone.util';
import {
  generateNumericCode,
  sha256,
} from '../../auth/utils/verification-code';
import { MailService } from '../../mail/mail.service';
import { CustomerOtpRepository } from '../repositories/customer-otp.repository';
import { ContactType } from '../schemas/customer-otp.schema';
import { CUSTOMER_OTP_REPOSITORY } from '../tokens';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60000;
const MS_PER_SECOND = 1000;
const OTP_CODE_LENGTH = 6;
const MASK_PHONE_MIN_LEN = 4;
const MASK_VISIBLE_CHARS = 2;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    @Inject(CUSTOMER_OTP_REPOSITORY)
    private readonly otpRepo: CustomerOtpRepository,
  ) {}

  /**
   * إرسال OTP للعميل
   */
  async sendOtp(
    merchantId: string,
    contact: string,
    contactType: ContactType,
  ): Promise<void> {
    // التحقق من صحة المدخلات
    this.validateContact(contact, contactType);

    // التحقق من عدم وجود OTP صالح حالي
    const existingOtp = await this.otpRepo.findByContactAndMerchant(
      contact,
      contactType,
      merchantId,
    );

    if (existingOtp) {
      // التحقق من عدم تجاوز الحد الأقصى للمحاولات
      if (existingOtp.attempts >= MAX_ATTEMPTS) {
        throw new BadRequestException(
          'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً',
        );
      }

      // التحقق من عدم الإرسال المتكرر (cooldown)
      const timeSinceCreation = Date.now() - existingOtp.createdAt.getTime();
      if (timeSinceCreation < COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (COOLDOWN_MS - timeSinceCreation) / MS_PER_SECOND,
        );
        throw new BadRequestException(
          `يرجى الانتظار ${remainingSeconds} ثانية قبل طلب رمز جديد`,
        );
      }
    }

    // حذف أي OTP منتهي الصلاحية
    await this.otpRepo.deleteExpired();

    // إنشاء رمز OTP جديد
    const code = generateNumericCode(OTP_CODE_LENGTH);
    const codeHash = sha256(code);
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * MS_PER_SECOND,
    );

    // حفظ OTP في قاعدة البيانات
    await this.otpRepo.create({
      merchantId,
      contact,
      contactType,
      codeHash,
      ...(process.env.NODE_ENV === 'development' ? { code } : {}),
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    });

    // إرسال OTP حسب نوع التواصل
    if (contactType === ContactType.EMAIL) {
      await this.sendOtpEmail(contact, code);
    } else {
      await this.sendOtpSms(contact, merchantId, code);
    }

    this.logger.log(
      `OTP sent to ${this.maskContact(contact, contactType)} via ${contactType} for merchant ${merchantId}`,
    );
  }

  /**
   * التحقق من صحة OTP
   */
  async verifyOtp(
    merchantId: string,
    contact: string,
    contactType: ContactType,
    code: string,
  ): Promise<{ customerId?: string; isNewCustomer: boolean }> {
    // التحقق من صحة المدخلات
    this.validateContact(contact, contactType);

    // البحث عن OTP صالح
    const otpRecord = await this.otpRepo.findByContactAndMerchant(
      contact,
      contactType,
      merchantId,
    );

    if (!otpRecord) {
      throw new BadRequestException('رمز التحقق غير صالح أو منتهي الصلاحية');
    }

    // التحقق من عدم تجاوز الحد الأقصى للمحاولات
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('تم تجاوز الحد الأقصى للمحاولات');
    }

    // التحقق من صحة الرمز
    const inputHash = sha256(code);
    if (inputHash !== otpRecord.codeHash) {
      // زيادة عدد المحاولات
      await this.otpRepo.updateAttempts(
        otpRecord._id!.toString(),
        otpRecord.attempts + 1,
      );
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    // التحقق من عدم انتهاء الصلاحية
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('انتهت صلاحية رمز التحقق');
    }

    // تحديث حالة OTP كمُتحقق منه
    await this.otpRepo.markAsVerified(otpRecord._id!.toString());

    this.logger.log(
      `OTP verified for ${this.maskContact(contact, contactType)} via ${contactType} for merchant ${merchantId}`,
    );

    // إرجاع معلومات العميل (سيتم إنشاؤه لاحقاً في الخدمة الرئيسية)
    return { isNewCustomer: true };
  }

  /**
   * التحقق من صحة المدخلات
   */
  private validateContact(contact: string, contactType: ContactType): void {
    if (!contact || contact.trim().length === 0) {
      throw new BadRequestException('معلومات التواصل مطلوبة');
    }

    if (contactType === ContactType.EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        throw new BadRequestException('البريد الإلكتروني غير صالح');
      }
    } else if (contactType === ContactType.PHONE) {
      const normalizedPhone = normalizePhone(contact);
      if (!normalizedPhone) {
        throw new BadRequestException('رقم الهاتف غير صالح');
      }
    }
  }

  /**
   * إرسال OTP عبر البريد الإلكتروني
   */
  private async sendOtpEmail(email: string, code: string): Promise<void> {
    try {
      await this.mailService.sendVerificationEmail(email, code);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send OTP email to ${email}: ${errorMessage}`,
      );
      throw new BadRequestException(
        'فشل في إرسال رمز التحقق عبر البريد الإلكتروني',
      );
    }
  }

  /**
   * إرسال OTP عبر SMS
   */
  private async sendOtpSms(
    phone: string,
    merchantId: string,
    code: string,
  ): Promise<void> {
    try {
      await this.smsService.sendOtpSms(phone, merchantId, code);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send OTP SMS to ${phone}: ${errorMessage}`);
      throw new BadRequestException('فشل في إرسال رمز التحقق عبر SMS');
    }
  }

  /**
   * إخفاء معلومات التواصل للأمان في الـ logs
   */
  private maskContact(contact: string, contactType: ContactType): string {
    if (contactType === ContactType.EMAIL) {
      const [local, domain] = contact.split('@');
      if (local.length <= 2) return `${local}***@${domain}`;
      return `${local.slice(0, 2)}***@${domain}`;
    } else {
      if (contact.length <= MASK_PHONE_MIN_LEN) return '****';
      return `${contact.slice(0, MASK_VISIBLE_CHARS)}****${contact.slice(-MASK_VISIBLE_CHARS)}`;
    }
  }
}
