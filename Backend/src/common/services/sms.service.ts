// src/common/services/sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WhatsappCloudService } from '../../modules/channels/whatsapp-cloud.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly whatsappCloudService: WhatsappCloudService,
  ) { }

  /**
   * إرسال OTP عبر SMS
   * يستخدم WhatsApp Cloud API كبديل لـ SMS التقليدي
   */
  async sendOtpSms(phone: string, merchantId: string, code: string): Promise<void> {
    try {
      // تنسيق الرسالة
      const message = `رمز التحقق الخاص بك في كليم: ${code}\n\nهذا الرمز صالح لمدة 10 دقائق فقط.`;

      // إرسال عبر WhatsApp Cloud API
      await this.whatsappCloudService.sendText(merchantId, phone, message);

      this.logger.log(`OTP SMS sent to ${this.maskPhone(phone)} for merchant ${merchantId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send OTP SMS to ${this.maskPhone(phone)}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * إخفاء رقم الهاتف للأمان في الـ logs
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
  }

  /**
   * إرسال إشعار عام عبر SMS
   */
  async sendNotificationSms(phone: string, merchantId: string, message: string): Promise<void> {
    try {
      await this.whatsappCloudService.sendText(merchantId, phone, message);
      this.logger.log(`Notification SMS sent to ${this.maskPhone(phone)} for merchant ${merchantId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send notification SMS to ${this.maskPhone(phone)}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
