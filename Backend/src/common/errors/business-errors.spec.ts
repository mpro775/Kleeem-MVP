// src/common/errors/business-errors.spec.ts

// ---- Mocks ----
// نُبدّل DomainError بكلاس بسيط يلتقط الوسائط ويُعرِّف الحقول للتحقق منها
class DomainErrorFake extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  getResponse() {
    return { code: this.code, message: this.message, details: this.details };
  }

  getStatus() {
    return this.status;
  }
}

jest.mock('./domain-error', () => ({
  DomainError: DomainErrorFake,
}));

import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '../constants/error-codes';

import {
  BusinessError,
  ProductNotFoundError,
  OutOfStockError,
  OrderNotFoundError,
  OrderAlreadyProcessedError,
  UserNotFoundError,
  MerchantNotFoundError,
  CategoryNotFoundError,
  NotificationNotFoundError,
  InsufficientBalanceError,
  ExternalServiceError,
  WebhookFailedError,
  ChatSessionNotFoundError,
  ChatMessageTooLongError,
  AiServiceUnavailableError,
  AiRateLimitExceededError,
  ChannelNotFoundError,
  ChannelDisabledError,
  MessageSendFailedError,
  MerchantDisabledError,
  StorefrontNotFoundError,
  AnalyticsDataNotFoundError,
  NotificationSendFailedError,
  N8nWorkflowNotFoundError,
  N8nWorkflowExecutionFailedError,
  VectorIndexError,
  VectorSearchError,
  EmbeddingGenerationFailedError,
  CatalogSyncFailedError,
  WebhookSignatureInvalidError,
  WebhookPayloadInvalidError,
  MediaUploadFailedError,
  MediaNotFoundError,
  CategoryHasProductsError,
  TelegramApiError,
  WhatsappApiError,
  EmailSendFailedError,
  LicenseExpiredError,
  QuotaExceededError,
  RateLimitExceededError,
  SuspiciousActivityError,
} from './business-errors';

import type { Mock } from 'jest-mock';

jest.mock('../constants/error-codes', () => ({
  ERROR_CODES: {
    NOT_FOUND: 'NOT_FOUND',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    ORDER_ALREADY_PROCESSED: 'ORDER_ALREADY_PROCESSED',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    WEBHOOK_FAILED: 'WEBHOOK_FAILED',
    CHAT_SESSION_NOT_FOUND: 'CHAT_SESSION_NOT_FOUND',
    CHAT_MESSAGE_TOO_LONG: 'CHAT_MESSAGE_TOO_LONG',
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    AI_RATE_LIMIT_EXCEEDED: 'AI_RATE_LIMIT_EXCEEDED',
    CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
    CHANNEL_DISABLED: 'CHANNEL_DISABLED',
    MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
    MERCHANT_DISABLED: 'MERCHANT_DISABLED',
    STOREFRONT_NOT_FOUND: 'STOREFRONT_NOT_FOUND',
    ANALYTICS_DATA_NOT_FOUND: 'ANALYTICS_DATA_NOT_FOUND',
    NOTIFICATION_SEND_FAILED: 'NOTIFICATION_SEND_FAILED',
    N8N_WORKFLOW_NOT_FOUND: 'N8N_WORKFLOW_NOT_FOUND',
    N8N_WORKFLOW_EXECUTION_FAILED: 'N8N_WORKFLOW_EXECUTION_FAILED',
    VECTOR_INDEX_ERROR: 'VECTOR_INDEX_ERROR',
    VECTOR_SEARCH_ERROR: 'VECTOR_SEARCH_ERROR',
    EMBEDDING_GENERATION_FAILED: 'EMBEDDING_GENERATION_FAILED',
    CATALOG_SYNC_FAILED: 'CATALOG_SYNC_FAILED',
    WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
    WEBHOOK_PAYLOAD_INVALID: 'WEBHOOK_PAYLOAD_INVALID',
    MEDIA_UPLOAD_FAILED: 'MEDIA_UPLOAD_FAILED',
    MEDIA_NOT_FOUND: 'MEDIA_NOT_FOUND',
    CATEGORY_HAS_PRODUCTS: 'CATEGORY_HAS_PRODUCTS',
    TELEGRAM_API_ERROR: 'TELEGRAM_API_ERROR',
    WHATSAPP_API_ERROR: 'WHATSAPP_API_ERROR',
    EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
    LICENSE_EXPIRED: 'LICENSE_EXPIRED',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  },
}));

// بعد تعريف الـ mocks نستورد الهدف قيد الاختبار

// نوع وهمي للخدمة مع كل الدوال المحتملة
type TService = {
  translateProduct: Mock;
  translateError: Mock;
  translateUser: Mock;
  translateMerchant: Mock;
  translateExternalError: Mock;
  translateBusinessError: Mock;
  translateFileError: Mock;
};

// مُنشئ خدمة ترجمة وهمية مع إمكانية تحديد المخرجات
const makeTs = (
  overrides?: Partial<Record<keyof TService, string>>,
): TService =>
  ({
    translateProduct: jest.fn().mockReturnValue(overrides?.translateProduct),
    translateError: jest.fn().mockReturnValue(overrides?.translateError),
    translateUser: jest.fn().mockReturnValue(overrides?.translateUser),
    translateMerchant: jest.fn().mockReturnValue(overrides?.translateMerchant),
    translateExternalError: jest
      .fn()
      .mockReturnValue(overrides?.translateExternalError),
    translateBusinessError: jest
      .fn()
      .mockReturnValue(overrides?.translateBusinessError),
    translateFileError: jest
      .fn()
      .mockReturnValue(overrides?.translateFileError),
  }) as unknown as TService;

// ======== BusinessError (الأساس) ========
describe('BusinessError (base)', () => {
  // يغطي: تميرير القيم إلى DomainError، وحفظ التفاصيل بشكل صحيح.
  it('should construct with given code/message/status/details', () => {
    // ARRANGE
    const code = 'X_CODE';
    const msg = 'Something bad';
    const status = 418;
    const details = { a: 1 };

    // ACT
    const err = new BusinessError(code, msg, status, details);

    // ASSERT
    expect(err).toBeInstanceOf(DomainErrorFake);
    expect(err.getResponse()).toEqual({ code, message: msg, details });
    expect(err.message).toBe(msg);
    expect(err.getStatus()).toBe(status);
    expect((err.getResponse() as any).details).toEqual(details);
  });

  it('should default status to BAD_REQUEST when not provided', () => {
    // ARRANGE
    const code = 'DEF';
    const msg = 'Default status';

    // ACT
    const err = new BusinessError(code, msg);

    // ASSERT
    expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
});

// ======== جدول تغطية الأصناف المتخصصة ========
type Case = {
  name: string;
  make: (ts?: TService) => any; // تُعيد المثال المُنشأ
  expect: {
    code: string;
    status: number;
    detailsKeys: string[];
    defaultMessageIncludes?: string | RegExp; // إن كانت الرسالة الافتراضية ديناميكية
    defaultMessageExact?: string; // إن كانت ثابتة
  };
  translation?: {
    method: keyof TService;
    keyUsed?: string; // شكلي، لا نتحقق من القيمة هنا
    translatedTo: string;
  };
};

const cases: Case[] = [
  {
    name: 'ProductNotFoundError',
    make: (ts) => new ProductNotFoundError('p1', ts as any),
    expect: {
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['productId'],
      defaultMessageExact: 'المنتج غير موجود',
    },
    translation: {
      method: 'translateProduct',
      keyUsed: 'errors.notFound',
      translatedTo: 'تمت الترجمة: المنتج غير موجود',
    },
  },
  {
    name: 'OutOfStockError',
    make: (ts) => new OutOfStockError('p2', 3, ts as any),
    expect: {
      code: ERROR_CODES.OUT_OF_STOCK,
      status: HttpStatus.CONFLICT,
      detailsKeys: ['productId', 'availableQuantity'],
      defaultMessageExact: 'المنتج غير متوفر حاليًا',
    },
    translation: {
      method: 'translateProduct',
      keyUsed: 'errors.outOfStock',
      translatedTo: 'تمت الترجمة: خارج المخزون',
    },
  },
  {
    name: 'OrderNotFoundError',
    make: (ts) => new OrderNotFoundError('o1', ts as any),
    expect: {
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['orderId'],
      defaultMessageExact: 'الطلب غير موجود',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'طلب غير موجود (ترجمة)',
    },
  },
  {
    name: 'OrderAlreadyProcessedError',
    make: (ts) => new OrderAlreadyProcessedError('o2', 'DONE', ts as any),
    expect: {
      code: ERROR_CODES.ORDER_ALREADY_PROCESSED,
      status: HttpStatus.CONFLICT,
      detailsKeys: ['orderId', 'status'],
      defaultMessageExact: 'الطلب تم معالجته مسبقاً',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.operationFailed',
      translatedTo: 'العملية فشلت (ترجمة)',
    },
  },
  {
    name: 'UserNotFoundError',
    make: (ts) => new UserNotFoundError('u1', ts as any),
    expect: {
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['userId'],
      defaultMessageExact: 'المستخدم غير موجود',
    },
    translation: {
      method: 'translateUser',
      keyUsed: 'errors.userNotFound',
      translatedTo: 'مستخدم غير موجود (ترجمة)',
    },
  },
  {
    name: 'MerchantNotFoundError',
    make: (ts) => new MerchantNotFoundError('m1', ts as any),
    expect: {
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['merchantId'],
      defaultMessageExact: 'التاجر غير موجود',
    },
    translation: {
      method: 'translateMerchant',
      keyUsed: 'errors.notFound',
      translatedTo: 'تاجر غير موجود (ترجمة)',
    },
  },
  {
    name: 'CategoryNotFoundError',
    make: (ts) => new CategoryNotFoundError('c1', ts as any),
    expect: {
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['categoryId'],
      defaultMessageExact: 'الفئة غير موجودة',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'فئة غير موجودة (ترجمة)',
    },
  },
  {
    name: 'NotificationNotFoundError',
    make: (ts) => new NotificationNotFoundError('n1', ts as any),
    expect: {
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['notificationId'],
      defaultMessageExact: 'الإشعار غير موجود',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'إشعار غير موجود (ترجمة)',
    },
  },
  {
    name: 'InsufficientBalanceError',
    make: (ts) => new InsufficientBalanceError('u9', 100, 20, ts as any),
    expect: {
      code: ERROR_CODES.INSUFFICIENT_BALANCE,
      status: HttpStatus.CONFLICT,
      detailsKeys: ['userId', 'required', 'available'],
      defaultMessageExact: 'رصيد غير كافي',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.insufficientPermissions',
      translatedTo: 'الرصيد غير كافٍ (ترجمة)',
    },
  },
  {
    name: 'ExternalServiceError',
    make: (ts) =>
      new ExternalServiceError('Payments', { timeout: true }, ts as any),
    expect: {
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['serviceName', 'originalError'],
      defaultMessageIncludes: /خدمة Payments/,
    },
    translation: {
      method: 'translateExternalError',
      keyUsed: 'apiError',
      translatedTo: 'خطأ API (ترجمة)',
    },
  },
  {
    name: 'WebhookFailedError',
    make: (ts) => new WebhookFailedError('https://x', 503, ts as any),
    expect: {
      code: ERROR_CODES.WEBHOOK_FAILED,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['webhookUrl', 'statusCode'],
      defaultMessageExact: 'فشل في إرسال webhook',
    },
    translation: {
      method: 'translateExternalError',
      keyUsed: 'webhookError',
      translatedTo: 'فشل Webhook (ترجمة)',
    },
  },
  {
    name: 'ChatSessionNotFoundError',
    make: (ts) => new ChatSessionNotFoundError('s1', ts as any),
    expect: {
      code: ERROR_CODES.CHAT_SESSION_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['sessionId'],
      defaultMessageExact: 'جلسة المحادثة غير موجودة',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'جلسة غير موجودة (ترجمة)',
    },
  },
  {
    name: 'ChatMessageTooLongError',
    make: (ts) => new ChatMessageTooLongError(128, 300, ts as any),
    expect: {
      code: ERROR_CODES.CHAT_MESSAGE_TOO_LONG,
      status: HttpStatus.BAD_REQUEST,
      detailsKeys: ['maxLength', 'actualLength'],
      defaultMessageExact: 'الرسالة طويلة جداً',
    },
    translation: {
      method: 'translateBusinessError',
      keyUsed: 'invalidOperation',
      translatedTo: 'رسالة طويلة (ترجمة)',
    },
  },
  {
    name: 'AiServiceUnavailableError',
    make: (ts) => new AiServiceUnavailableError('OpenAI', ts as any),
    expect: {
      code: ERROR_CODES.AI_SERVICE_UNAVAILABLE,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      detailsKeys: ['serviceName'],
      defaultMessageIncludes: /OpenAI غير متاحة/,
    },
    translation: {
      method: 'translateBusinessError',
      keyUsed: 'maintenanceMode',
      translatedTo: 'الصيانة (ترجمة)',
    },
  },
  {
    name: 'AiRateLimitExceededError',
    make: (ts) => new AiRateLimitExceededError('OpenAI', 10, ts as any),
    expect: {
      code: ERROR_CODES.AI_RATE_LIMIT_EXCEEDED,
      status: HttpStatus.TOO_MANY_REQUESTS,
      detailsKeys: ['serviceName', 'retryAfter'],
      defaultMessageExact:
        'تم تجاوز الحد المسموح من الطلبات لخدمة الذكاء الاصطناعي',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.rateLimitExceeded',
      translatedTo: 'تم تجاوز الحد (ترجمة)',
    },
  },
  {
    name: 'ChannelNotFoundError',
    make: (ts) => new ChannelNotFoundError('ch1', ts as any),
    expect: {
      code: ERROR_CODES.CHANNEL_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['channelId'],
      defaultMessageExact: 'القناة غير موجودة',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'قناة غير موجودة (ترجمة)',
    },
  },
  {
    name: 'ChannelDisabledError',
    make: (ts) => new ChannelDisabledError('ch2', ts as any),
    expect: {
      code: ERROR_CODES.CHANNEL_DISABLED,
      status: HttpStatus.FORBIDDEN,
      detailsKeys: ['channelId'],
      defaultMessageExact: 'القناة معطلة',
    },
    translation: {
      method: 'translateBusinessError',
      keyUsed: 'resourceAlreadyExists',
      translatedTo: 'القناة معطلة (ترجمة)',
    },
  },
  {
    name: 'MessageSendFailedError',
    make: (ts) => new MessageSendFailedError('ch3', 'timeout', ts as any),
    expect: {
      code: ERROR_CODES.MESSAGE_SEND_FAILED,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['channelId', 'reason'],
      defaultMessageExact: 'فشل في إرسال الرسالة',
    },
    translation: {
      method: 'translateBusinessError',
      keyUsed: 'operationFailed',
      translatedTo: 'فشل إرسال (ترجمة)',
    },
  },
  {
    name: 'MerchantDisabledError',
    make: (ts) => new MerchantDisabledError('m2', ts as any),
    expect: {
      code: ERROR_CODES.MERCHANT_DISABLED,
      status: HttpStatus.FORBIDDEN,
      detailsKeys: ['merchantId'],
      defaultMessageExact: 'التاجر معطل',
    },
    translation: {
      method: 'translateMerchant',
      keyUsed: 'errors.disabled',
      translatedTo: 'تاجر معطل (ترجمة)',
    },
  },
  {
    name: 'StorefrontNotFoundError',
    make: (ts) => new StorefrontNotFoundError('st1', ts as any),
    expect: {
      code: ERROR_CODES.STOREFRONT_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['storefrontId'],
      defaultMessageExact: 'المتجر غير موجود',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'متجر غير موجود (ترجمة)',
    },
  },
  {
    name: 'AnalyticsDataNotFoundError',
    make: (ts) => new AnalyticsDataNotFoundError('q=xyz', ts as any),
    expect: {
      code: ERROR_CODES.ANALYTICS_DATA_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['query'],
      defaultMessageExact: 'بيانات التحليلات غير موجودة',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'لا توجد بيانات (ترجمة)',
    },
  },
  {
    name: 'NotificationSendFailedError',
    make: (ts) => new NotificationSendFailedError('email', 'smtp', ts as any),
    expect: {
      code: ERROR_CODES.NOTIFICATION_SEND_FAILED,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['channel', 'reason'],
      defaultMessageExact: 'فشل في إرسال الإشعار',
    },
    translation: {
      method: 'translateExternalError',
      keyUsed: 'notificationSendFailed',
      translatedTo: 'إشعار فشل (ترجمة)',
    },
  },
  {
    name: 'N8nWorkflowNotFoundError',
    make: (ts) => new N8nWorkflowNotFoundError('wf1', ts as any),
    expect: {
      code: ERROR_CODES.N8N_WORKFLOW_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['workflowId'],
      defaultMessageExact: 'سير العمل غير موجود',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'notFound',
      translatedTo: 'سير غير موجود (ترجمة)',
    },
  },
  {
    name: 'N8nWorkflowExecutionFailedError',
    make: (ts) => new N8nWorkflowExecutionFailedError('wf2', 'boom', ts as any),
    expect: {
      code: ERROR_CODES.N8N_WORKFLOW_EXECUTION_FAILED,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detailsKeys: ['workflowId', 'error'],
      defaultMessageExact: 'فشل في تنفيذ سير العمل',
    },
    translation: {
      method: 'translateBusinessError',
      keyUsed: 'operationFailed',
      translatedTo: 'فشل التنفيذ (ترجمة)',
    },
  },
  {
    name: 'VectorIndexError',
    make: (ts) => new VectorIndexError('col1', 'e', ts as any),
    expect: {
      code: ERROR_CODES.VECTOR_INDEX_ERROR,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detailsKeys: ['collection', 'error'],
      defaultMessageExact: 'خطأ في فهرسة البيانات',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'system.configurationError',
      translatedTo: 'خطأ تهيئة (ترجمة)',
    },
  },
  {
    name: 'VectorSearchError',
    make: (ts) => new VectorSearchError('hello', 'e', ts as any),
    expect: {
      code: ERROR_CODES.VECTOR_SEARCH_ERROR,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detailsKeys: ['query', 'error'],
      defaultMessageExact: 'خطأ في البحث',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'system.databaseError',
      translatedTo: 'خطأ قاعدة بيانات (ترجمة)',
    },
  },
  {
    name: 'EmbeddingGenerationFailedError',
    make: (ts) => new EmbeddingGenerationFailedError('text', 'e', ts as any),
    expect: {
      code: ERROR_CODES.EMBEDDING_GENERATION_FAILED,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detailsKeys: ['text', 'error'],
      defaultMessageExact: 'فشل في توليد التضمين',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'system.configurationError',
      translatedTo: 'خطأ تهيئة (ترجمة)',
    },
  },
  {
    name: 'CatalogSyncFailedError',
    make: (ts) => new CatalogSyncFailedError('m9', 'e', ts as any),
    expect: {
      code: ERROR_CODES.CATALOG_SYNC_FAILED,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detailsKeys: ['merchantId', 'error'],
      defaultMessageExact: 'فشل في مزامنة الكتالوج',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'system.configurationError',
      translatedTo: 'فشل مزامنة (ترجمة)',
    },
  },
  {
    name: 'WebhookSignatureInvalidError',
    make: (ts) => new WebhookSignatureInvalidError('stripe', ts as any),
    expect: {
      code: ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
      status: HttpStatus.UNAUTHORIZED,
      detailsKeys: ['provider'],
      defaultMessageExact: 'توقيع الويب هوك غير صحيح',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.insufficientPermissions',
      translatedTo: 'توقيع خاطئ (ترجمة)',
    },
  },
  {
    name: 'WebhookPayloadInvalidError',
    make: (ts) => new WebhookPayloadInvalidError('stripe', 'id', ts as any),
    expect: {
      code: ERROR_CODES.WEBHOOK_PAYLOAD_INVALID,
      status: HttpStatus.BAD_REQUEST,
      detailsKeys: ['provider', 'field'],
      defaultMessageExact: 'بيانات الويب هوك غير صحيحة',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'validation.invalidInput',
      translatedTo: 'مدخلات غير صحيحة (ترجمة)',
    },
  },
  {
    name: 'MediaUploadFailedError',
    make: (ts) => new MediaUploadFailedError('a.png', 'e', ts as any),
    expect: {
      code: ERROR_CODES.MEDIA_UPLOAD_FAILED,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detailsKeys: ['fileName', 'error'],
      defaultMessageExact: 'فشل في رفع الملف',
    },
    translation: {
      method: 'translateFileError',
      keyUsed: 'uploadFailed',
      translatedTo: 'رفع فشل (ترجمة)',
    },
  },
  {
    name: 'MediaNotFoundError',
    make: (ts) => new MediaNotFoundError('mid', ts as any),
    expect: {
      code: ERROR_CODES.MEDIA_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      detailsKeys: ['mediaId'],
      defaultMessageExact: 'الملف غير موجود',
    },
    translation: {
      method: 'translateFileError',
      keyUsed: 'fileNotFound',
      translatedTo: 'ملف غير موجود (ترجمة)',
    },
  },
  {
    name: 'CategoryHasProductsError',
    make: (ts) => new CategoryHasProductsError('c9', 5, ts as any),
    expect: {
      code: ERROR_CODES.CATEGORY_HAS_PRODUCTS,
      status: HttpStatus.CONFLICT,
      detailsKeys: ['categoryId', 'productCount'],
      defaultMessageExact: 'لا يمكن حذف الفئة لوجود منتجات فيها',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.invalidOperation',
      translatedTo: 'عملية غير صالحة (ترجمة)',
    },
  },
  {
    name: 'TelegramApiError',
    make: (ts) => new TelegramApiError('sendMessage', 'e', ts as any),
    expect: {
      code: ERROR_CODES.TELEGRAM_API_ERROR,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['method', 'error'],
      defaultMessageExact: 'خطأ في API تيليجرام',
    },
    translation: {
      method: 'translateExternalError',
      keyUsed: 'telegramApiError',
      translatedTo: 'خطأ تيليجرام (ترجمة)',
    },
  },
  {
    name: 'WhatsappApiError',
    make: (ts) => new WhatsappApiError('send', 'e', ts as any),
    expect: {
      code: ERROR_CODES.WHATSAPP_API_ERROR,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['method', 'error'],
      defaultMessageExact: 'خطأ في API واتساب',
    },
    translation: {
      method: 'translateExternalError',
      keyUsed: 'whatsappApiError',
      translatedTo: 'خطأ واتساب (ترجمة)',
    },
  },
  {
    name: 'EmailSendFailedError',
    make: (ts) => new EmailSendFailedError('to@x.com', 'e', ts as any),
    expect: {
      code: ERROR_CODES.EMAIL_SEND_FAILED,
      status: HttpStatus.BAD_GATEWAY,
      detailsKeys: ['to', 'error'],
      defaultMessageExact: 'فشل في إرسال البريد الإلكتروني',
    },
    translation: {
      method: 'translateExternalError',
      keyUsed: 'emailSendFailed',
      translatedTo: 'فشل البريد (ترجمة)',
    },
  },
  {
    name: 'LicenseExpiredError',
    make: (ts) =>
      new LicenseExpiredError('m3', new Date('2024-01-01'), ts as any),
    expect: {
      code: ERROR_CODES.LICENSE_EXPIRED,
      status: HttpStatus.FORBIDDEN,
      detailsKeys: ['merchantId', 'expiryDate'],
      defaultMessageExact: 'الترخيص منتهي الصلاحية',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.invalidOperation',
      translatedTo: 'الترخيص منتهي (ترجمة)',
    },
  },
  {
    name: 'QuotaExceededError',
    make: (ts) => new QuotaExceededError('msgs', 100, 120, ts as any),
    expect: {
      code: ERROR_CODES.QUOTA_EXCEEDED,
      status: HttpStatus.FORBIDDEN,
      detailsKeys: ['quotaType', 'limit', 'used'],
      defaultMessageExact: 'تم تجاوز الحد المسموح',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.quotaExceeded',
      translatedTo: 'تم تجاوز الكوتا (ترجمة)',
    },
  },
  {
    name: 'RateLimitExceededError',
    make: (ts) => new RateLimitExceededError(100, 60, 10, ts as any),
    expect: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      status: HttpStatus.TOO_MANY_REQUESTS,
      detailsKeys: ['limit', 'window', 'retryAfter'],
      defaultMessageExact: 'تم تجاوز الحد المسموح من الطلبات',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.rateLimitExceeded',
      translatedTo: 'ريتك محدود (ترجمة)',
    },
  },
  {
    name: 'SuspiciousActivityError',
    make: (ts) => new SuspiciousActivityError('login', '1.1.1.1', ts as any),
    expect: {
      code: ERROR_CODES.SUSPICIOUS_ACTIVITY,
      status: HttpStatus.FORBIDDEN,
      detailsKeys: ['activity', 'ip'],
      defaultMessageExact: 'نشاط مشبوه تم اكتشافه',
    },
    translation: {
      method: 'translateError',
      keyUsed: 'business.invalidOperation',
      translatedTo: 'نشاط مشبوه (ترجمة)',
    },
  },
];

// ======== اختبارات عامة موحّدة لكل صنف متخصص ========
describe('BusinessError subclasses', () => {
  // يغطي: (1) عدم وجود خدمة ترجمة => رسالة افتراضية، (2) وجود خدمة ترجمة => استخدام النص المُترجم،
  // مع التحقق من الكود والحالة والتفاصيل المتوقعة لكل صنف.

  describe.each(cases)('$name (default messages)', (tc) => {
    let err: any;

    beforeEach(() => {
      // ARRANGE
      // بدون خدمة ترجمة => يجب استخدام الرسالة الافتراضية
      err = tc.make(undefined as any);
    });

    it('should set code/status/details correctly', () => {
      // ACT  (تم الإنشاء في beforeEach)

      // ASSERT
      expect(err.getResponse().code).toBe(tc.expect.code);
      expect(err.getStatus()).toBe(tc.expect.status);
      expect(err.details).toBeDefined();
      tc.expect.detailsKeys.forEach((key) => {
        expect(err.details).toHaveProperty(key);
      });
    });

    it('should use default message when translation not provided', () => {
      // ACT

      // ASSERT
      expect(err.message).toBeTruthy(); // Always ensure message exists

      expect(err.message).toBe(
        tc.expect.defaultMessageExact !== undefined
          ? tc.expect.defaultMessageExact
          : err.message,
      );

      expect(err.message).toMatch(tc.expect.defaultMessageIncludes ?? '');
    });
  });

  describe.each(cases)('$name (with translation service)', (tc) => {
    let err: any;
    let ts: TService;

    beforeEach(() => {
      // ARRANGE
      const overrides: Partial<Record<keyof TService, string>> = {};
      if (tc.translation) {
        overrides[tc.translation.method] = tc.translation.translatedTo;
      }
      ts = makeTs(overrides);
      // ACT
      err = tc.make(ts);
    });

    it('should call translation method when service provided', () => {
      // ASSERT

      const spy = ts[tc.translation!.method];
      expect(spy).toHaveBeenCalledTimes(1);
      expect(err.message).toBe(tc.translation!.translatedTo);

      // No translation expected - just ensure message exists
      expect(err.message).toBeTruthy();
    });
  });
});

// ======== حالات حدّية إضافية ========
describe('Edge cases', () => {
  // يغطي: قيم افتراضية للحقول الاختيارية داخل التفاصيل.

  it('OutOfStockError should default availableQuantity to 0', () => {
    // ARRANGE
    const err = new OutOfStockError('pX');

    // ACT

    // ASSERT
    const response = err.getResponse() as any;
    expect(response.details).toHaveProperty('availableQuantity');
    expect(response.details?.availableQuantity).toBe(0);
  });

  it('AiRateLimitExceededError accepts undefined retryAfter in details', () => {
    // ARRANGE
    const err = new AiRateLimitExceededError('svc');

    // ACT & ASSERT
    const response = err.getResponse() as any;
    expect(response.details).toHaveProperty('serviceName');
    expect(response.details).toHaveProperty('retryAfter');
    expect(response.details?.retryAfter).toBeUndefined();
  });

  it('MessageSendFailedError allows optional reason field', () => {
    // ARRANGE
    const err = new MessageSendFailedError('chX');

    // ASSERT
    const response = err.getResponse() as any;
    expect(response.details).toHaveProperty('channelId');
    expect(response.details).toHaveProperty('reason');
    expect(response.details?.reason).toBeUndefined();
  });

  it('ExternalServiceError defaults originalError to undefined when not provided', () => {
    // ARRANGE
    const err = new ExternalServiceError('Billing');

    // ASSERT
    const response = err.getResponse() as any;
    expect(response.details).toHaveProperty('serviceName');
    expect(response.details).toHaveProperty('originalError');
    expect(response.details?.originalError).toBeUndefined();
  });
});
