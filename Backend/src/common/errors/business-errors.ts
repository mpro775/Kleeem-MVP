// src/common/errors/business-errors.ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DomainError } from './domain-error';
import { ERROR_CODES } from '../constants/error-codes';
import { TranslationService } from '../services/translation.service';

/** أخطاء الأعمال المتخصصة */
export class BusinessError extends DomainError {
  constructor(
    code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    super(code, message, status, details);
  }
}

// أخطاء المنتجات
@Injectable()
export class ProductNotFoundError extends BusinessError {
  constructor(
    productId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      translationService?.translateProduct('errors.notFound') ||
        'المنتج غير موجود',
      HttpStatus.NOT_FOUND,
      { productId },
    );
  }
}

@Injectable()
export class OutOfStockError extends BusinessError {
  constructor(
    productId: string,
    availableQuantity: number = 0,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.OUT_OF_STOCK,
      translationService?.translateProduct('errors.outOfStock') ||
        'المنتج غير متوفر حاليًا',
      HttpStatus.CONFLICT,
      { productId, availableQuantity },
    );
  }
}

// أخطاء الطلبات
@Injectable()
export class OrderNotFoundError extends BusinessError {
  constructor(
    orderId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      translationService?.translateError('notFound') || 'الطلب غير موجود',
      HttpStatus.NOT_FOUND,
      { orderId },
    );
  }
}

@Injectable()
export class OrderAlreadyProcessedError extends BusinessError {
  constructor(
    orderId: string,
    status: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.ORDER_ALREADY_PROCESSED,
      translationService?.translateError('business.operationFailed') ||
        'الطلب تم معالجته مسبقاً',
      HttpStatus.CONFLICT,
      { orderId, status },
    );
  }
}

// أخطاء المستخدمين
@Injectable()
export class UserNotFoundError extends BusinessError {
  constructor(
    userId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      translationService?.translateUser('errors.userNotFound') ||
        'المستخدم غير موجود',
      HttpStatus.NOT_FOUND,
      { userId },
    );
  }
}

@Injectable()
export class MerchantNotFoundError extends BusinessError {
  constructor(
    merchantId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      translationService?.translateMerchant('errors.notFound') ||
        'التاجر غير موجود',
      HttpStatus.NOT_FOUND,
      { merchantId },
    );
  }
}

@Injectable()
export class CategoryNotFoundError extends BusinessError {
  constructor(
    categoryId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      translationService?.translateError('notFound') || 'الفئة غير موجودة',
      HttpStatus.NOT_FOUND,
      { categoryId },
    );
  }
}

@Injectable()
export class NotificationNotFoundError extends BusinessError {
  constructor(
    notificationId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      translationService?.translateError('notFound') || 'الإشعار غير موجود',
      HttpStatus.NOT_FOUND,
      { notificationId },
    );
  }
}

@Injectable()
export class InsufficientBalanceError extends BusinessError {
  constructor(
    userId: string,
    required: number,
    available: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.INSUFFICIENT_BALANCE,
      translationService?.translateError('business.insufficientPermissions') ||
        'رصيد غير كافي',
      HttpStatus.CONFLICT,
      { userId, required, available },
    );
  }
}

// أخطاء التكامل
@Injectable()
export class ExternalServiceError extends BusinessError {
  constructor(
    serviceName: string,
    originalError?: any,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      translationService?.translateExternalError('apiError') ||
        `خطأ في خدمة ${serviceName}`,
      HttpStatus.BAD_GATEWAY,
      { serviceName, originalError },
    );
  }
}

@Injectable()
export class WebhookFailedError extends BusinessError {
  constructor(
    webhookUrl: string,
    statusCode: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.WEBHOOK_FAILED,
      translationService?.translateExternalError('webhookError') ||
        'فشل في إرسال webhook',
      HttpStatus.BAD_GATEWAY,
      { webhookUrl, statusCode },
    );
  }
}

// أخطاء المحادثة والذكاء الاصطناعي
@Injectable()
export class ChatSessionNotFoundError extends BusinessError {
  constructor(
    sessionId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.CHAT_SESSION_NOT_FOUND,
      translationService?.translateError('notFound') ||
        'جلسة المحادثة غير موجودة',
      HttpStatus.NOT_FOUND,
      { sessionId },
    );
  }
}

@Injectable()
export class ChatMessageTooLongError extends BusinessError {
  constructor(
    maxLength: number,
    actualLength: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.CHAT_MESSAGE_TOO_LONG,
      translationService?.translateBusinessError('invalidOperation') ||
        'الرسالة طويلة جداً',
      HttpStatus.BAD_REQUEST,
      { maxLength, actualLength },
    );
  }
}

@Injectable()
export class AiServiceUnavailableError extends BusinessError {
  constructor(
    serviceName: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.AI_SERVICE_UNAVAILABLE,
      translationService?.translateBusinessError('maintenanceMode') ||
        `خدمة الذكاء الاصطناعي ${serviceName} غير متاحة`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { serviceName },
    );
  }
}

@Injectable()
export class AiRateLimitExceededError extends BusinessError {
  constructor(
    serviceName: string,
    retryAfter?: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.AI_RATE_LIMIT_EXCEEDED,
      translationService?.translateError('business.rateLimitExceeded') ||
        'تم تجاوز الحد المسموح من الطلبات لخدمة الذكاء الاصطناعي',
      HttpStatus.TOO_MANY_REQUESTS,
      { serviceName, retryAfter },
    );
  }
}

// أخطاء القنوات والتواصل
@Injectable()
export class ChannelNotFoundError extends BusinessError {
  constructor(
    channelId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.CHANNEL_NOT_FOUND,
      translationService?.translateError('notFound') || 'القناة غير موجودة',
      HttpStatus.NOT_FOUND,
      { channelId },
    );
  }
}

@Injectable()
export class ChannelDisabledError extends BusinessError {
  constructor(
    channelId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.CHANNEL_DISABLED,
      translationService?.translateBusinessError('resourceAlreadyExists') ||
        'القناة معطلة',
      HttpStatus.FORBIDDEN,
      { channelId },
    );
  }
}

@Injectable()
export class MessageSendFailedError extends BusinessError {
  constructor(
    channelId: string,
    reason?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.MESSAGE_SEND_FAILED,
      translationService?.translateBusinessError('operationFailed') ||
        'فشل في إرسال الرسالة',
      HttpStatus.BAD_GATEWAY,
      { channelId, reason },
    );
  }
}

// أخطاء التاجر والمتجر
@Injectable()
export class MerchantDisabledError extends BusinessError {
  constructor(
    merchantId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.MERCHANT_DISABLED,
      translationService?.translateMerchant('errors.disabled') || 'التاجر معطل',
      HttpStatus.FORBIDDEN,
      { merchantId },
    );
  }
}

@Injectable()
export class StorefrontNotFoundError extends BusinessError {
  constructor(
    storefrontId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.STOREFRONT_NOT_FOUND,
      translationService?.translateError('notFound') || 'المتجر غير موجود',
      HttpStatus.NOT_FOUND,
      { storefrontId },
    );
  }
}

// أخطاء التحليلات
@Injectable()
export class AnalyticsDataNotFoundError extends BusinessError {
  constructor(
    query: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.ANALYTICS_DATA_NOT_FOUND,
      translationService?.translateError('notFound') ||
        'بيانات التحليلات غير موجودة',
      HttpStatus.NOT_FOUND,
      { query },
    );
  }
}

// أخطاء الإشعارات
@Injectable()
export class NotificationSendFailedError extends BusinessError {
  constructor(
    channel: string,
    reason?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.NOTIFICATION_SEND_FAILED,
      translationService?.translateExternalError('notificationSendFailed') ||
        'فشل في إرسال الإشعار',
      HttpStatus.BAD_GATEWAY,
      { channel, reason },
    );
  }
}

// أخطاء N8N
@Injectable()
export class N8nWorkflowNotFoundError extends BusinessError {
  constructor(
    workflowId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.N8N_WORKFLOW_NOT_FOUND,
      translationService?.translateError('notFound') || 'سير العمل غير موجود',
      HttpStatus.NOT_FOUND,
      { workflowId },
    );
  }
}

@Injectable()
export class N8nWorkflowExecutionFailedError extends BusinessError {
  constructor(
    workflowId: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.N8N_WORKFLOW_EXECUTION_FAILED,
      translationService?.translateBusinessError('operationFailed') ||
        'فشل في تنفيذ سير العمل',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { workflowId, error },
    );
  }
}

// أخطاء الفيكتور والبحث
@Injectable()
export class VectorIndexError extends BusinessError {
  constructor(
    collection: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.VECTOR_INDEX_ERROR,
      translationService?.translateError('system.configurationError') ||
        'خطأ في فهرسة البيانات',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { collection, error },
    );
  }
}

@Injectable()
export class VectorSearchError extends BusinessError {
  constructor(
    query: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.VECTOR_SEARCH_ERROR,
      translationService?.translateError('system.databaseError') ||
        'خطأ في البحث',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { query, error },
    );
  }
}

@Injectable()
export class EmbeddingGenerationFailedError extends BusinessError {
  constructor(
    text: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.EMBEDDING_GENERATION_FAILED,
      translationService?.translateError('system.configurationError') ||
        'فشل في توليد التضمين',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { text, error },
    );
  }
}

// أخطاء الكتالوج
@Injectable()
export class CatalogSyncFailedError extends BusinessError {
  constructor(
    merchantId: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.CATALOG_SYNC_FAILED,
      translationService?.translateError('system.configurationError') ||
        'فشل في مزامنة الكتالوج',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { merchantId, error },
    );
  }
}

// أخطاء الويب هوك
@Injectable()
export class WebhookSignatureInvalidError extends BusinessError {
  constructor(
    provider: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
      translationService?.translateError('business.insufficientPermissions') ||
        'توقيع الويب هوك غير صحيح',
      HttpStatus.UNAUTHORIZED,
      { provider },
    );
  }
}

@Injectable()
export class WebhookPayloadInvalidError extends BusinessError {
  constructor(
    provider: string,
    field?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.WEBHOOK_PAYLOAD_INVALID,
      translationService?.translateError('validation.invalidInput') ||
        'بيانات الويب هوك غير صحيحة',
      HttpStatus.BAD_REQUEST,
      { provider, field },
    );
  }
}

// أخطاء الميديا
@Injectable()
export class MediaUploadFailedError extends BusinessError {
  constructor(
    fileName: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.MEDIA_UPLOAD_FAILED,
      translationService?.translateFileError('uploadFailed') ||
        'فشل في رفع الملف',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { fileName, error },
    );
  }
}

@Injectable()
export class MediaNotFoundError extends BusinessError {
  constructor(
    mediaId: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.MEDIA_NOT_FOUND,
      translationService?.translateFileError('fileNotFound') ||
        'الملف غير موجود',
      HttpStatus.NOT_FOUND,
      { mediaId },
    );
  }
}

// أخطاء التصنيف
@Injectable()
export class CategoryHasProductsError extends BusinessError {
  constructor(
    categoryId: string,
    productCount: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.CATEGORY_HAS_PRODUCTS,
      translationService?.translateError('business.invalidOperation') ||
        'لا يمكن حذف الفئة لوجود منتجات فيها',
      HttpStatus.CONFLICT,
      { categoryId, productCount },
    );
  }
}

// أخطاء التكامل مع الخدمات الخارجية
@Injectable()
export class TelegramApiError extends BusinessError {
  constructor(
    method: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.TELEGRAM_API_ERROR,
      translationService?.translateExternalError('telegramApiError') ||
        'خطأ في API تيليجرام',
      HttpStatus.BAD_GATEWAY,
      { method, error },
    );
  }
}

@Injectable()
export class WhatsappApiError extends BusinessError {
  constructor(
    method: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.WHATSAPP_API_ERROR,
      translationService?.translateExternalError('whatsappApiError') ||
        'خطأ في API واتساب',
      HttpStatus.BAD_GATEWAY,
      { method, error },
    );
  }
}

@Injectable()
export class EmailSendFailedError extends BusinessError {
  constructor(
    to: string,
    error?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.EMAIL_SEND_FAILED,
      translationService?.translateExternalError('emailSendFailed') ||
        'فشل في إرسال البريد الإلكتروني',
      HttpStatus.BAD_GATEWAY,
      { to, error },
    );
  }
}

// أخطاء الترخيص والحدود
@Injectable()
export class LicenseExpiredError extends BusinessError {
  constructor(
    merchantId: string,
    expiryDate: Date,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.LICENSE_EXPIRED,
      translationService?.translateError('business.invalidOperation') ||
        'الترخيص منتهي الصلاحية',
      HttpStatus.FORBIDDEN,
      { merchantId, expiryDate },
    );
  }
}

@Injectable()
export class QuotaExceededError extends BusinessError {
  constructor(
    quotaType: string,
    limit: number,
    used: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.QUOTA_EXCEEDED,
      translationService?.translateError('business.quotaExceeded') ||
        'تم تجاوز الحد المسموح',
      HttpStatus.FORBIDDEN,
      { quotaType, limit, used },
    );
  }
}

// أخطاء الأمان
@Injectable()
export class RateLimitExceededError extends BusinessError {
  constructor(
    limit: number,
    window: number,
    retryAfter?: number,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      translationService?.translateError('business.rateLimitExceeded') ||
        'تم تجاوز الحد المسموح من الطلبات',
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, window, retryAfter },
    );
  }
}

@Injectable()
export class SuspiciousActivityError extends BusinessError {
  constructor(
    activity: string,
    ip?: string,
    private readonly translationService?: TranslationService,
  ) {
    super(
      ERROR_CODES.SUSPICIOUS_ACTIVITY,
      translationService?.translateError('business.invalidOperation') ||
        'نشاط مشبوه تم اكتشافه',
      HttpStatus.FORBIDDEN,
      { activity, ip },
    );
  }
}
