import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import type { TranslateOptions } from 'nestjs-i18n';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly i18n: I18nService) {}

  /**
   * ترجمة مفتاح عام
   */
  translate(key: string, options?: TranslateOptions): string {
    try {
      return this.i18n.translate(key, options);
    } catch {
      this.logger.warn(`Translation key not found: ${key}`);
      // إرجاع المفتاح الأصلي في حالة عدم وجود الترجمة
      return key;
    }
  }

  /**
   * ترجمة رسالة خطأ
   */
  translateError(errorKey: string, options?: TranslateOptions): string {
    return this.translate(`errors.${errorKey}`, options);
  }

  /**
   * ترجمة رسالة نجاح
   */
  translateSuccess(successKey: string, options?: TranslateOptions): string {
    return this.translate(`messages.success.${successKey}`, options);
  }

  /**
   * ترجمة رسالة تحقق
   */
  translateValidation(
    validationKey: string,
    options?: TranslateOptions,
  ): string {
    return this.translate(`validation.${validationKey}`, options);
  }

  /**
   * ترجمة رسالة منتج
   */
  translateProduct(productKey: string, options?: TranslateOptions): string {
    return this.translate(`products.${productKey}`, options);
  }

  /**
   * ترجمة رسالة تاجر
   */
  translateMerchant(merchantKey: string, options?: TranslateOptions): string {
    return this.translate(`merchants.${merchantKey}`, options);
  }

  /**
   * ترجمة رسالة مستخدم
   */
  translateUser(userKey: string, options?: TranslateOptions): string {
    return this.translate(`users.${userKey}`, options);
  }

  /**
   * ترجمة رسالة مصادقة
   */
  translateAuth(authKey: string, options?: TranslateOptions): string {
    return this.translate(`auth.${authKey}`, options);
  }

  /**
   * ترجمة رسائل المصادقة حسب النوع
   */
  translateAuthMessage(
    type: 'errors' | 'messages' | 'validation',
    key: string,
    options?: TranslateOptions,
  ): string {
    return this.translate(`auth.${type}.${key}`, options);
  }

  /**
   * ترجمة رسائل المنتجات حسب النوع
   */
  translateProductMessage(
    type: 'errors' | 'messages' | 'operations',
    key: string,
    options?: TranslateOptions,
  ): string {
    return this.translate(`products.${type}.${key}`, options);
  }

  /**
   * ترجمة رسائل التجار حسب النوع
   */
  translateMerchantMessage(
    type: 'errors' | 'messages' | 'checklist',
    key: string,
    options?: TranslateOptions,
  ): string {
    return this.translate(`merchants.${type}.${key}`, options);
  }

  /**
   * ترجمة رسائل الأخطاء الخارجية
   */
  translateExternalError(
    externalKey: string,
    options?: TranslateOptions,
  ): string {
    return this.translate(`errors.external.${externalKey}`, options);
  }

  /**
   * ترجمة رسائل أخطاء الملفات
   */
  translateFileError(fileKey: string, options?: TranslateOptions): string {
    return this.translate(`errors.file.${fileKey}`, options);
  }

  /**
   * ترجمة رسائل الأخطاء التجارية
   */
  translateBusinessError(
    businessKey: string,
    options?: TranslateOptions,
  ): string {
    return this.translate(`errors.business.${businessKey}`, options);
  }

  /**
   * الحصول على اللغة الحالية
   */
  getCurrentLanguage(): string {
    // Default to Arabic as fallback language
    return 'ar';
  }

  /**
   * التحقق من وجود مفتاح ترجمة
   */
  hasTranslation(key: string): boolean {
    try {
      const translation = this.i18n.translate<string>(key);
      // إذا كان مختلفًا عن المفتاح الأصلي فهذا يعني وجود ترجمة
      return translation !== key;
    } catch {
      return false;
    }
  }

  /**
   * ترجمة متعددة المفاتيح
   */
  translateMultiple(
    keys: string[],
    options?: TranslateOptions,
  ): Record<string, string> {
    const translations: Record<string, string> = {};
    for (const key of keys) {
      translations[key] = this.translate(key, options);
    }
    return translations;
  }

  /**
   * ترجمة مع fallback
   */
  translateWithFallback(
    key: string,
    fallback: string,
    options?: TranslateOptions,
  ): string {
    const translation = this.translate(key, options);
    return translation === key ? fallback : translation;
  }

  /**
   * ترجمة مصفوفة من النصوص
   */
  translateArray(keys: string[], options?: TranslateOptions): string[] {
    return keys.map((key) => this.translate(key, options));
  }
}
