import { registerDecorator, ValidationOptions } from 'class-validator';
import { TranslationService } from '../services/translation.service';
import { i18nValidationMessage } from 'nestjs-i18n';

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
  context: Record<string, any>,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'I18nMessageWithContext',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return true;
        },

        defaultMessage(args: any) {
          try {
            const translationService = (global as any)
              .translationService as TranslationService;

            if (translationService) {
              return translationService.translateValidation(translationKey);
            } else {
              return `validation.${translationKey}`;
            }
          } catch (error) {
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
    const translationService = (global as any)
      .translationService as TranslationService;

    if (translationService) {
      return translationService.translateValidation(key);
    }

    return defaultMessage || key;
  } catch (error) {
    return defaultMessage || key;
  }
}
