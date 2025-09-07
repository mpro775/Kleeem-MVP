// src/common/errors/business-errors.ts
import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';
import { ERROR_CODES } from '../constants/error-codes';

/** أخطاء الأعمال المتخصصة */
export class BusinessError extends DomainError {
  constructor(
    code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: any
  ) {
    super(code, message, status, details);
  }
}

// أخطاء المنتجات
export class ProductNotFoundError extends BusinessError {
  constructor(productId: string) {
    super(
      ERROR_CODES.NOT_FOUND,
      'المنتج غير موجود',
      HttpStatus.NOT_FOUND,
      { productId }
    );
  }
}

export class OutOfStockError extends BusinessError {
  constructor(productId: string, availableQuantity: number = 0) {
    super(
      ERROR_CODES.OUT_OF_STOCK,
      'المنتج غير متوفر حاليًا',
      HttpStatus.CONFLICT,
      { productId, availableQuantity }
    );
  }
}

// أخطاء الطلبات
export class OrderNotFoundError extends BusinessError {
  constructor(orderId: string) {
    super(
      ERROR_CODES.NOT_FOUND,
      'الطلب غير موجود',
      HttpStatus.NOT_FOUND,
      { orderId }
    );
  }
}

export class OrderAlreadyProcessedError extends BusinessError {
  constructor(orderId: string, status: string) {
    super(
      ERROR_CODES.ORDER_ALREADY_PROCESSED,
      'الطلب تم معالجته مسبقاً',
      HttpStatus.CONFLICT,
      { orderId, status }
    );
  }
}

// أخطاء المستخدمين
export class UserNotFoundError extends BusinessError {
  constructor(userId: string) {
    super(
      ERROR_CODES.NOT_FOUND,
      'المستخدم غير موجود',
      HttpStatus.NOT_FOUND,
      { userId }
    );
  }
}

export class MerchantNotFoundError extends BusinessError {
  constructor(merchantId: string) {
    super(
      ERROR_CODES.NOT_FOUND,
      'التاجر غير موجود',
      HttpStatus.NOT_FOUND,
      { merchantId }
    );
  }
}

export class CategoryNotFoundError extends BusinessError {
  constructor(categoryId: string) {
    super(
      ERROR_CODES.NOT_FOUND,
      'الفئة غير موجودة',
      HttpStatus.NOT_FOUND,
      { categoryId }
    );
  }
}

export class NotificationNotFoundError extends BusinessError {
  constructor(notificationId: string) {
    super(
      ERROR_CODES.NOT_FOUND,
      'الإشعار غير موجود',
      HttpStatus.NOT_FOUND,
      { notificationId }
    );
  }
}

export class InsufficientBalanceError extends BusinessError {
  constructor(userId: string, required: number, available: number) {
    super(
      ERROR_CODES.INSUFFICIENT_BALANCE,
      'رصيد غير كافي',
      HttpStatus.CONFLICT,
      { userId, required, available }
    );
  }
}

// أخطاء التكامل
export class ExternalServiceError extends BusinessError {
  constructor(serviceName: string, originalError?: any) {
    super(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      `خطأ في خدمة ${serviceName}`,
      HttpStatus.BAD_GATEWAY,
      { serviceName, originalError }
    );
  }
}

export class WebhookFailedError extends BusinessError {
  constructor(webhookUrl: string, statusCode: number) {
    super(
      ERROR_CODES.WEBHOOK_FAILED,
      'فشل في إرسال webhook',
      HttpStatus.BAD_GATEWAY,
      { webhookUrl, statusCode }
    );
  }
}

// أخطاء المحادثة والذكاء الاصطناعي
export class ChatSessionNotFoundError extends BusinessError {
  constructor(sessionId: string) {
    super(
      ERROR_CODES.CHAT_SESSION_NOT_FOUND,
      'جلسة المحادثة غير موجودة',
      HttpStatus.NOT_FOUND,
      { sessionId }
    );
  }
}

export class ChatMessageTooLongError extends BusinessError {
  constructor(maxLength: number, actualLength: number) {
    super(
      ERROR_CODES.CHAT_MESSAGE_TOO_LONG,
      'الرسالة طويلة جداً',
      HttpStatus.BAD_REQUEST,
      { maxLength, actualLength }
    );
  }
}

export class AiServiceUnavailableError extends BusinessError {
  constructor(serviceName: string) {
    super(
      ERROR_CODES.AI_SERVICE_UNAVAILABLE,
      `خدمة الذكاء الاصطناعي ${serviceName} غير متاحة`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { serviceName }
    );
  }
}

export class AiRateLimitExceededError extends BusinessError {
  constructor(serviceName: string, retryAfter?: number) {
    super(
      ERROR_CODES.AI_RATE_LIMIT_EXCEEDED,
      'تم تجاوز الحد المسموح من الطلبات لخدمة الذكاء الاصطناعي',
      HttpStatus.TOO_MANY_REQUESTS,
      { serviceName, retryAfter }
    );
  }
}

// أخطاء القنوات والتواصل
export class ChannelNotFoundError extends BusinessError {
  constructor(channelId: string) {
    super(
      ERROR_CODES.CHANNEL_NOT_FOUND,
      'القناة غير موجودة',
      HttpStatus.NOT_FOUND,
      { channelId }
    );
  }
}

export class ChannelDisabledError extends BusinessError {
  constructor(channelId: string) {
    super(
      ERROR_CODES.CHANNEL_DISABLED,
      'القناة معطلة',
      HttpStatus.FORBIDDEN,
      { channelId }
    );
  }
}

export class MessageSendFailedError extends BusinessError {
  constructor(channelId: string, reason?: string) {
    super(
      ERROR_CODES.MESSAGE_SEND_FAILED,
      'فشل في إرسال الرسالة',
      HttpStatus.BAD_GATEWAY,
      { channelId, reason }
    );
  }
}

// أخطاء التاجر والمتجر
export class MerchantDisabledError extends BusinessError {
  constructor(merchantId: string) {
    super(
      ERROR_CODES.MERCHANT_DISABLED,
      'التاجر معطل',
      HttpStatus.FORBIDDEN,
      { merchantId }
    );
  }
}

export class StorefrontNotFoundError extends BusinessError {
  constructor(storefrontId: string) {
    super(
      ERROR_CODES.STOREFRONT_NOT_FOUND,
      'المتجر غير موجود',
      HttpStatus.NOT_FOUND,
      { storefrontId }
    );
  }
}

// أخطاء التحليلات
export class AnalyticsDataNotFoundError extends BusinessError {
  constructor(query: string) {
    super(
      ERROR_CODES.ANALYTICS_DATA_NOT_FOUND,
      'بيانات التحليلات غير موجودة',
      HttpStatus.NOT_FOUND,
      { query }
    );
  }
}

// أخطاء الإشعارات
export class NotificationSendFailedError extends BusinessError {
  constructor(channel: string, reason?: string) {
    super(
      ERROR_CODES.NOTIFICATION_SEND_FAILED,
      'فشل في إرسال الإشعار',
      HttpStatus.BAD_GATEWAY,
      { channel, reason }
    );
  }
}

// أخطاء N8N
export class N8nWorkflowNotFoundError extends BusinessError {
  constructor(workflowId: string) {
    super(
      ERROR_CODES.N8N_WORKFLOW_NOT_FOUND,
      'سير العمل غير موجود',
      HttpStatus.NOT_FOUND,
      { workflowId }
    );
  }
}

export class N8nWorkflowExecutionFailedError extends BusinessError {
  constructor(workflowId: string, error?: string) {
    super(
      ERROR_CODES.N8N_WORKFLOW_EXECUTION_FAILED,
      'فشل في تنفيذ سير العمل',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { workflowId, error }
    );
  }
}

// أخطاء الفيكتور والبحث
export class VectorIndexError extends BusinessError {
  constructor(collection: string, error?: string) {
    super(
      ERROR_CODES.VECTOR_INDEX_ERROR,
      'خطأ في فهرسة البيانات',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { collection, error }
    );
  }
}

export class VectorSearchError extends BusinessError {
  constructor(query: string, error?: string) {
    super(
      ERROR_CODES.VECTOR_SEARCH_ERROR,
      'خطأ في البحث',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { query, error }
    );
  }
}

export class EmbeddingGenerationFailedError extends BusinessError {
  constructor(text: string, error?: string) {
    super(
      ERROR_CODES.EMBEDDING_GENERATION_FAILED,
      'فشل في توليد التضمين',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { text, error }
    );
  }
}

// أخطاء الكتالوج
export class CatalogSyncFailedError extends BusinessError {
  constructor(merchantId: string, error?: string) {
    super(
      ERROR_CODES.CATALOG_SYNC_FAILED,
      'فشل في مزامنة الكتالوج',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { merchantId, error }
    );
  }
}

// أخطاء الويب هوك
export class WebhookSignatureInvalidError extends BusinessError {
  constructor(provider: string) {
    super(
      ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
      'توقيع الويب هوك غير صحيح',
      HttpStatus.UNAUTHORIZED,
      { provider }
    );
  }
}

export class WebhookPayloadInvalidError extends BusinessError {
  constructor(provider: string, field?: string) {
    super(
      ERROR_CODES.WEBHOOK_PAYLOAD_INVALID,
      'بيانات الويب هوك غير صحيحة',
      HttpStatus.BAD_REQUEST,
      { provider, field }
    );
  }
}

// أخطاء الميديا
export class MediaUploadFailedError extends BusinessError {
  constructor(fileName: string, error?: string) {
    super(
      ERROR_CODES.MEDIA_UPLOAD_FAILED,
      'فشل في رفع الملف',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { fileName, error }
    );
  }
}

export class MediaNotFoundError extends BusinessError {
  constructor(mediaId: string) {
    super(
      ERROR_CODES.MEDIA_NOT_FOUND,
      'الملف غير موجود',
      HttpStatus.NOT_FOUND,
      { mediaId }
    );
  }
}

// أخطاء التصنيف
export class CategoryHasProductsError extends BusinessError {
  constructor(categoryId: string, productCount: number) {
    super(
      ERROR_CODES.CATEGORY_HAS_PRODUCTS,
      'لا يمكن حذف الفئة لوجود منتجات فيها',
      HttpStatus.CONFLICT,
      { categoryId, productCount }
    );
  }
}

// أخطاء التكامل مع الخدمات الخارجية
export class TelegramApiError extends BusinessError {
  constructor(method: string, error?: string) {
    super(
      ERROR_CODES.TELEGRAM_API_ERROR,
      'خطأ في API تيليجرام',
      HttpStatus.BAD_GATEWAY,
      { method, error }
    );
  }
}

export class WhatsappApiError extends BusinessError {
  constructor(method: string, error?: string) {
    super(
      ERROR_CODES.WHATSAPP_API_ERROR,
      'خطأ في API واتساب',
      HttpStatus.BAD_GATEWAY,
      { method, error }
    );
  }
}

export class EmailSendFailedError extends BusinessError {
  constructor(to: string, error?: string) {
    super(
      ERROR_CODES.EMAIL_SEND_FAILED,
      'فشل في إرسال البريد الإلكتروني',
      HttpStatus.BAD_GATEWAY,
      { to, error }
    );
  }
}

// أخطاء الترخيص والحدود
export class LicenseExpiredError extends BusinessError {
  constructor(merchantId: string, expiryDate: Date) {
    super(
      ERROR_CODES.LICENSE_EXPIRED,
      'الترخيص منتهي الصلاحية',
      HttpStatus.FORBIDDEN,
      { merchantId, expiryDate }
    );
  }
}

export class QuotaExceededError extends BusinessError {
  constructor(quotaType: string, limit: number, used: number) {
    super(
      ERROR_CODES.QUOTA_EXCEEDED,
      'تم تجاوز الحد المسموح',
      HttpStatus.FORBIDDEN,
      { quotaType, limit, used }
    );
  }
}

// أخطاء الأمان
export class RateLimitExceededError extends BusinessError {
  constructor(limit: number, window: number, retryAfter?: number) {
    super(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'تم تجاوز الحد المسموح من الطلبات',
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, window, retryAfter }
    );
  }
}

export class SuspiciousActivityError extends BusinessError {
  constructor(activity: string, ip?: string) {
    super(
      ERROR_CODES.SUSPICIOUS_ACTIVITY,
      'نشاط مشبوه تم اكتشافه',
      HttpStatus.FORBIDDEN,
      { activity, ip }
    );
  }
}
