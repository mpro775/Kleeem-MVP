import { Injectable } from '@nestjs/common';
import { TranslationService } from '../services/translation.service';

/**
 * خدمة للتعامل مع أخطاء الأعمال مع الترجمة
 */
@Injectable()
export class BusinessErrorService {
  constructor(private readonly translationService: TranslationService) {}

  /**
   * ترجمة رسالة خطأ المنتجات
   */
  translateProductError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `products.errors.${errorKey}`,
      args,
    );
  }

  /**
   * ترجمة رسالة خطأ التجار
   */
  translateMerchantError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `merchants.errors.${errorKey}`,
      args,
    );
  }

  /**
   * ترجمة رسالة خطأ المستخدمين
   */
  translateUserError(errorKey: string, args?: any): string {
    return this.translationService.translate(`users.errors.${errorKey}`, args);
  }

  /**
   * ترجمة رسالة خطأ المصادقة
   */
  translateAuthError(errorKey: string, args?: any): string {
    return this.translationService.translate(`auth.errors.${errorKey}`, args);
  }

  /**
   * ترجمة رسالة خطأ عامة
   */
  translateGeneralError(errorKey: string, args?: any): string {
    return this.translationService.translateError(errorKey, args);
  }

  /**
   * ترجمة رسالة خطأ الأعمال
   */
  translateBusinessError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `errors.business.${errorKey}`,
      args,
    );
  }

  /**
   * ترجمة رسالة خطأ النظام
   */
  translateSystemError(errorKey: string, args?: any): string {
    return this.translationService.translate(`errors.system.${errorKey}`, args);
  }

  /**
   * ترجمة رسالة خطأ خارجي
   */
  translateExternalError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `errors.external.${errorKey}`,
      args,
    );
  }

  /**
   * ترجمة رسالة خطأ الملفات
   */
  translateFileError(errorKey: string, args?: any): string {
    return this.translationService.translate(`errors.file.${errorKey}`, args);
  }

  /**
   * ترجمة رسالة خطأ الشبكة
   */
  translateNetworkError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `errors.network.${errorKey}`,
      args,
    );
  }

  /**
   * ترجمة رسالة خطأ الأداء
   */
  translatePerformanceError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `errors.performance.${errorKey}`,
      args,
    );
  }

  /**
   * ترجمة رسالة خطأ ودية للمستخدم
   */
  translateUserFriendlyError(errorKey: string, args?: any): string {
    return this.translationService.translate(
      `errors.userFriendly.${errorKey}`,
      args,
    );
  }
}
