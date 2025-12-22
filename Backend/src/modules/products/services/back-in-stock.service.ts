// src/modules/products/services/back-in-stock.service.ts
import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';

import { SmsService } from '../../../common/services/sms.service';
import { MailService } from '../../mail/mail.service';

import { BackInStockRequest, BackInStockRequestDocument, BackInStockStatus } from '../schemas/back-in-stock-request.schema';
import { BACK_IN_STOCK_REQUEST_REPOSITORY } from '../tokens';
import { BackInStockRequestRepository } from '../repositories/back-in-stock-request.repository';

@Injectable()
export class BackInStockService {
  private readonly logger = new Logger(BackInStockService.name);

  constructor(
    @Inject(BACK_IN_STOCK_REQUEST_REPOSITORY)
    private readonly backInStockRepo: BackInStockRequestRepository,
    private readonly smsService: SmsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * إنشاء طلب إشعار عند توفر المنتج
   */
  async createRequest(
    merchantId: string,
    productId: string,
    variantId?: string,
    customerId?: string,
    contact?: string,
  ): Promise<BackInStockRequest> {
    // التحقق من صحة المدخلات
    if (!contact && !customerId) {
      throw new BadRequestException('يجب تقديم معلومات التواصل أو معرف العميل');
    }

    // التحقق من عدم وجود طلب مكرر
    const existingRequest = await this.backInStockRepo.findByProductAndContact(
      merchantId,
      productId,
      variantId,
      contact,
      customerId,
    );

    if (existingRequest && existingRequest.status === BackInStockStatus.PENDING) {
      throw new BadRequestException('يوجد طلب سابق لهذا المنتج');
    }

    // إنشاء الطلب
    return this.backInStockRepo.create({
      merchantId,
      productId,
      variantId: variantId || null,
      customerId: customerId || undefined,
      contact: contact || '',
      status: BackInStockStatus.PENDING,
    });
  }

  /**
   * إلغاء طلب إشعار
   */
  async cancelRequest(
    merchantId: string,
    requestId: string,
  ): Promise<boolean> {
    const request = await this.backInStockRepo.findByIdAndMerchant(requestId, merchantId);
    if (!request) {
      throw new BadRequestException('الطلب غير موجود');
    }

    if (request.status !== BackInStockStatus.PENDING) {
      throw new BadRequestException('لا يمكن إلغاء طلب تم إشعاره');
    }

    return this.backInStockRepo.updateStatus(requestId, BackInStockStatus.CANCELLED);
  }

  /**
   * الحصول على طلبات العميل
   */
  async getCustomerRequests(
    merchantId: string,
    customerId?: string,
    contact?: string,
  ): Promise<BackInStockRequest[]> {
    if (!customerId && !contact) {
      throw new BadRequestException('يجب تقديم معرف العميل أو معلومات التواصل');
    }

    return this.backInStockRepo.findByCustomerOrContact(merchantId, customerId, contact);
  }

  /**
   * معالجة المنتجات التي أصبحت متوفرة (للـ cron job)
   */
  async processBackInStockNotifications(
    merchantId: string,
    productId: string,
    variantId?: string,
  ): Promise<number> {
    // العثور على جميع الطلبات المعلقة لهذا المنتج
    const pendingRequests = await this.backInStockRepo.findPendingByProduct(
      merchantId,
      productId,
      variantId,
    );

    if (pendingRequests.length === 0) {
      return 0;
    }

    let notificationCount = 0;

    // إرسال الإشعارات
    for (const request of pendingRequests) {
      try {
        await this.sendNotification(request);
        await this.backInStockRepo.updateStatusAndNotifiedAt(
          request._id!.toString(),
          BackInStockStatus.NOTIFIED,
          new Date(),
        );
        notificationCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send back-in-stock notification for request ${request._id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Processed ${notificationCount} back-in-stock notifications for product ${productId}`,
    );

    return notificationCount;
  }

  /**
   * إرسال إشعار واحد
   */
  private async sendNotification(request: BackInStockRequestDocument): Promise<void> {
    const message = `🎉 المنتج الذي طلبت إشعاره أصبح متوفراً الآن!\n\nيمكنك زيارة متجرنا لإكمال الشراء.`;

    // إرسال الإشعار عبر SMS أو Email حسب نوع التواصل
    if (request.contact.includes('@')) {
      // Email
      try {
        // TODO: تنفيذ إرسال البريد الإلكتروني
        console.log(`Sending back-in-stock email to ${request.contact}`);
      } catch (error) {
        throw new Error(`Failed to send email notification: ${error.message}`);
      }
    } else {
      // SMS
      await this.smsService.sendNotificationSms(
        request.contact,
        request.merchantId,
        message,
      );
    }
  }

  /**
   * تنظيف الطلبات القديمة (للـ maintenance)
   */
  async cleanupOldRequests(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.backInStockRepo.deleteOldRequests(cutoffDate);
  }
}
