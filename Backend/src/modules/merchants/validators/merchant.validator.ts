import { Injectable } from '@nestjs/common';
import {
  MERCHANT_STATUS,
  BUSINESS_TYPES,
  MERCHANT_LIMITS,
  MerchantStatus,
  BusinessType,
} from '../constants/merchant.constants';

@Injectable()
export class MerchantValidator {
  /**
   * Validate merchant name
   */
  static validateName(name: string): { valid: boolean; message?: string } {
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
  static validateEmail(email: string): { valid: boolean; message?: string } {
    if (!email || email.trim().length === 0) {
      return { valid: false, message: 'البريد الإلكتروني مطلوب' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'تنسيق البريد الإلكتروني غير صحيح' };
    }

    return { valid: true };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): { valid: boolean; message?: string } {
    if (!phone || phone.trim().length === 0) {
      return { valid: false, message: 'رقم الهاتف مطلوب' };
    }

    // Remove all non-digit characters
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
  static validateStatus(status: string): { valid: boolean; message?: string } {
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
  static validateBusinessType(businessType: string): {
    valid: boolean;
    message?: string;
  } {
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
  static validateSlug(slug: string): { valid: boolean; message?: string } {
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

    // Check for valid slug format (letters, numbers, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return {
        valid: false,
        message:
          'رابط المتجر يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط',
      };
    }

    // Check that slug doesn't start or end with hyphen
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
  static validateDescription(description: string): {
    valid: boolean;
    message?: string;
  } {
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

  /**
   * Validate complete merchant data
   */
  static validateMerchantData(data: {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    businessType?: string;
    slug?: string;
    description?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.name !== undefined) {
      const nameValidation = this.validateName(data.name);
      if (!nameValidation.valid) {
        errors.push(nameValidation.message!);
      }
    }

    if (data.email !== undefined) {
      const emailValidation = this.validateEmail(data.email);
      if (!emailValidation.valid) {
        errors.push(emailValidation.message!);
      }
    }

    if (data.phone !== undefined) {
      const phoneValidation = this.validatePhone(data.phone);
      if (!phoneValidation.valid) {
        errors.push(phoneValidation.message!);
      }
    }

    if (data.status !== undefined) {
      const statusValidation = this.validateStatus(data.status);
      if (!statusValidation.valid) {
        errors.push(statusValidation.message!);
      }
    }

    if (data.businessType !== undefined) {
      const businessTypeValidation = this.validateBusinessType(
        data.businessType,
      );
      if (!businessTypeValidation.valid) {
        errors.push(businessTypeValidation.message!);
      }
    }

    if (data.slug !== undefined) {
      const slugValidation = this.validateSlug(data.slug);
      if (!slugValidation.valid) {
        errors.push(slugValidation.message!);
      }
    }

    if (data.description !== undefined) {
      const descriptionValidation = this.validateDescription(data.description);
      if (!descriptionValidation.valid) {
        errors.push(descriptionValidation.message!);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
