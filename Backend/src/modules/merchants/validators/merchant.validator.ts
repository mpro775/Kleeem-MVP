import { Injectable } from '@nestjs/common';

import {
  MERCHANT_STATUS,
  BUSINESS_TYPES,
  MERCHANT_LIMITS,
  MerchantStatus,
  BusinessType,
} from '../constants/merchant.constants';

// ===== Types =====
type ValidationResult = { valid: boolean; message?: string };

// ===== Regex/constants (no magic) =====
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;

@Injectable()
export class MerchantValidator {
  /**
   * Validate merchant name
   */
  static validateName(this: void, name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'اسم المتجر مطلوب' };
    }
    if (name.length < MERCHANT_LIMITS.NAME_MIN_LENGTH) {
      return {
        valid: false,
        message: `اسم المتجر يجب أن يكون ${MERCHANT_LIMITS.NAME_MIN_LENGTH} أحرف على الأقل`,
      };
    }
    if (name.length > MERCHANT_LIMITS.NAME_MAX_LENGTH) {
      return {
        valid: false,
        message: `اسم المتجر يجب ألا يتجاوز ${MERCHANT_LIMITS.NAME_MAX_LENGTH} حرف`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate email format
   */
  static validateEmail(this: void, email: string): ValidationResult {
    if (!email || email.trim().length === 0) {
      return { valid: false, message: 'البريد الإلكتروني مطلوب' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { valid: false, message: 'تنسيق البريد الإلكتروني غير صحيح' };
    }
    return { valid: true };
  }

  /**
   * Validate phone number
   */
  static validatePhone(this: void, phone: string): ValidationResult {
    if (!phone || phone.trim().length === 0) {
      return { valid: false, message: 'رقم الهاتف مطلوب' };
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < MERCHANT_LIMITS.PHONE_MIN_LENGTH) {
      return {
        valid: false,
        message: `رقم الهاتف يجب أن يكون ${MERCHANT_LIMITS.PHONE_MIN_LENGTH} أرقام على الأقل`,
      };
    }
    if (cleanPhone.length > MERCHANT_LIMITS.PHONE_MAX_LENGTH) {
      return {
        valid: false,
        message: `رقم الهاتف يجب ألا يتجاوز ${MERCHANT_LIMITS.PHONE_MAX_LENGTH} رقم`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate merchant status
   */
  static validateStatus(this: void, status: string): ValidationResult {
    if (!Object.values(MERCHANT_STATUS).includes(status as MerchantStatus)) {
      return {
        valid: false,
        message: `حالة المتجر غير صحيحة. القيم المسموحة: ${Object.values(MERCHANT_STATUS).join(', ')}`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate business type
   */
  static validateBusinessType(
    this: void,
    businessType: string,
  ): ValidationResult {
    if (!Object.values(BUSINESS_TYPES).includes(businessType as BusinessType)) {
      return {
        valid: false,
        message: `نوع النشاط التجاري غير صحيح. القيم المسموحة: ${Object.values(BUSINESS_TYPES).join(', ')}`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate merchant slug
   */
  static validateSlug(this: void, slug: string): ValidationResult {
    if (!slug || slug.trim().length === 0) {
      return { valid: false, message: 'رابط المتجر مطلوب' };
    }
    if (slug.length < MERCHANT_LIMITS.SLUG_MIN_LENGTH) {
      return {
        valid: false,
        message: `رابط المتجر يجب أن يكون ${MERCHANT_LIMITS.SLUG_MIN_LENGTH} أحرف على الأقل`,
      };
    }
    if (slug.length > MERCHANT_LIMITS.SLUG_MAX_LENGTH) {
      return {
        valid: false,
        message: `رابط المتجر يجب ألا يتجاوز ${MERCHANT_LIMITS.SLUG_MAX_LENGTH} حرف`,
      };
    }
    if (!SLUG_REGEX.test(slug)) {
      return {
        valid: false,
        message:
          'رابط المتجر يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط',
      };
    }
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return {
        valid: false,
        message: 'رابط المتجر لا يمكن أن يبدأ أو ينتهي بشرطة',
      };
    }
    return { valid: true };
  }

  /**
   * Validate merchant description
   */
  static validateDescription(
    this: void,
    description: string,
  ): ValidationResult {
    if (
      description &&
      description.length > MERCHANT_LIMITS.DESCRIPTION_MAX_LENGTH
    ) {
      return {
        valid: false,
        message: `وصف المتجر يجب ألا يتجاوز ${MERCHANT_LIMITS.DESCRIPTION_MAX_LENGTH} حرف`,
      };
    }
    return { valid: true };
  }

  private static pushIfInvalid(
    this: void,
    res: ValidationResult,
    errors: string[],
  ): void {
    if (!res.valid && res.message) errors.push(res.message);
  }

  /**
   * Validate complete merchant data (low complexity, no unbound methods)
   */
  static validateMerchantData(
    this: void,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      status?: string;
      businessType?: string;
      slug?: string;
      description?: string;
    },
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // نستخدم أسهماً لضمان عدم تمرير مراجع غير مربوطة (unbound)
    const checks: Array<
      [value: string | undefined, validator: (v: string) => ValidationResult]
    > = [
      [data.name, (v) => MerchantValidator.validateName(v)],
      [data.email, (v) => MerchantValidator.validateEmail(v)],
      [data.phone, (v) => MerchantValidator.validatePhone(v)],
      [data.status, (v) => MerchantValidator.validateStatus(v)],
      [data.businessType, (v) => MerchantValidator.validateBusinessType(v)],
      [data.slug, (v) => MerchantValidator.validateSlug(v)],
      [data.description, (v) => MerchantValidator.validateDescription(v)],
    ];

    for (const [value, validate] of checks) {
      if (typeof value !== 'undefined') {
        const res = validate(value);
        MerchantValidator.pushIfInvalid(res, errors);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
