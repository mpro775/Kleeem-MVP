import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class TranslationService {
  constructor(private readonly i18n: I18nService) {}

  /**
   * ترجمة مفتاح عام
   */
  translate(key: string, args?: any): string {
    try {
      return this.i18n.translate(key, args);
    } catch (error) {
      console.warn(`Translation key not found: ${key}`);
      return key; // إرجاع المفتاح الأصلي في حالة عدم وجود الترجمة
    }
  }

  /**
   * ترجمة رسالة خطأ
   */
  translateError(errorKey: string, args?: any): string {
    return this.translate(`errors.${errorKey}`, args);
  }

  /**
   * ترجمة رسالة نجاح
   */
  translateSuccess(successKey: string, args?: any): string {
    return this.translate(`messages.success.${successKey}`, args);
  }

  /**
   * ترجمة رسالة تحقق
   */
  translateValidation(validationKey: string, args?: any): string {
    return this.translate(`validation.${validationKey}`, args);
  }

  /**
   * ترجمة رسالة منتج
   */
  translateProduct(productKey: string, args?: any): string {
    return this.translate(`products.${productKey}`, args);
  }

  /**
   * ترجمة رسالة تاجر
   */
  translateMerchant(merchantKey: string, args?: any): string {
    return this.translate(`merchants.${merchantKey}`, args);
  }

  /**
   * ترجمة رسالة مستخدم
   */
  translateUser(userKey: string, args?: any): string {
    return this.translate(`users.${userKey}`, args);
  }

  /**
   * ترجمة رسالة مصادقة
   */
  translateAuth(authKey: string, args?: any): string {
    return this.translate(`auth.${authKey}`, args);
  }

  /**
   * ترجمة رسائل المصادقة حسب النوع
   */
  translateAuthMessage(
    type: 'errors' | 'messages' | 'validation',
    key: string,
    args?: any,
  ): string {
    return this.translate(`auth.${type}.${key}`, args);
  }

  /**
   * ترجمة رسائل المنتجات حسب النوع
   */
  translateProductMessage(
    type: 'errors' | 'messages' | 'operations',
    key: string,
    args?: any,
  ): string {
    return this.translate(`products.${type}.${key}`, args);
  }

  /**
   * ترجمة رسائل التجار حسب النوع
   */
  translateMerchantMessage(
    type: 'errors' | 'messages' | 'checklist',
    key: string,
    args?: any,
  ): string {
    return this.translate(`merchants.${type}.${key}`, args);
  }

  /**
   * ترجمة رسائل الأخطاء الخارجية
   */
  translateExternalError(externalKey: string, args?: any): string {
    return this.translate(`errors.external.${externalKey}`, args);
  }

  /**
   * ترجمة رسائل أخطاء الملفات
   */
  translateFileError(fileKey: string, args?: any): string {
    return this.translate(`errors.file.${fileKey}`, args);
  }

  /**
   * ترجمة رسائل الأخطاء التجارية
   */
  translateBusinessError(businessKey: string, args?: any): string {
    return this.translate(`errors.business.${businessKey}`, args);
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
      const translation = this.i18n.translate(key);
      return translation !== key; // إذا كان مختلف عن المفتاح الأصلي فهذا يعني وجود ترجمة
    } catch {
      return false;
    }
  }

  /**
   * ترجمة متعددة المفاتيح
   */
  translateMultiple(keys: string[], args?: any): Record<string, string> {
    const translations: Record<string, string> = {};

    keys.forEach((key) => {
      translations[key] = this.translate(key, args);
    });

    return translations;
  }

  /**
   * ترجمة مع fallback
   */
  translateWithFallback(key: string, fallback: string, args?: any): string {
    const translation = this.translate(key, args);
    return translation === key ? fallback : translation;
  }

  /**
   * ترجمة مصفوفة من النصوص
   */
  translateArray(keys: string[], args?: any): string[] {
    return keys.map((key) => this.translate(key, args));
  }
}
