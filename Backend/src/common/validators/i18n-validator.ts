import { registerDecorator } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import type { TranslationService } from '../services/translation.service';
import type { ValidationOptions } from 'class-validator';

/**
 * Custom validation decorator للرسائل المترجمة
 * يستبدل النصوص الثابتة برسائل مترجمة من نظام i18n
 */

/**
 * استخدام:
 * @IsString(I18nMessage('validation.string'))
 * @IsString(I18nMessage('validation.string', { each: true }))
 * @IsEnum(Currency, I18nMessage('validation.enum'))
 * @IsNumber({}, I18nMessage('validation.number'))
 */
export const I18nMessage = (
  translationKey: string,
  validationOptions: ValidationOptions = {},
): ValidationOptions => ({
  ...validationOptions,
  message: i18nValidationMessage(translationKey),
});

/**
 * Custom validation decorator للرسائل المترجمة مع context إضافي
 */
export function I18nMessageWithContext(
  translationKey: string,
  context: Record<string, unknown>,
  validationOptions?: ValidationOptions,
): (object: object, propertyName: string) => void {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'I18nMessageWithContext',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate() {
          return true;
        },

        defaultMessage() {
          try {
            const translationService = (
              global as unknown as { translationService: TranslationService }
            ).translationService;

            if (translationService) {
              return translationService.translateValidation(translationKey);
            } else {
              return `validation.${translationKey}`;
            }
          } catch {
            return `validation.${translationKey}`;
          }
        },
      },
    });
  };
}

/**
 * مساعد لإنشاء رسائل تحقق مترجمة
 */
export class I18nValidationMessages {
  static required = 'required';
  static minLength = 'minLength';
  static maxLength = 'maxLength';
  static email = 'email';
  static url = 'url';
  static uuid = 'uuid';
  static number = 'number';
  static boolean = 'boolean';
  static array = 'array';
  static object = 'object';
  static string = 'string';
  static date = 'date';
  static positive = 'positive';
  static negative = 'negative';
  static integer = 'integer';
  static decimal = 'decimal';
}

/**
 * دالة مساعدة للحصول على رسالة مترجمة مباشرة
 */
export function getTranslatedMessage(
  key: string,
  defaultMessage?: string,
): string {
  try {
    const translationService = (
      global as unknown as { translationService: TranslationService }
    ).translationService;

    if (translationService) {
      return translationService.translateValidation(key);
    }

    return defaultMessage || key;
  } catch {
    return defaultMessage || key;
  }
}
