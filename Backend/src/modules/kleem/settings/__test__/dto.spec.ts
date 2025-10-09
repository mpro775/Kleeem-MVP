import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateBotRuntimeSettingsDto } from '../dto/update-settings.dto';

describe('UpdateBotRuntimeSettingsDto', () => {
  describe('Basic Validation', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-01-01T00:00:00.000Z',
        applyUrl: 'https://example.com/apply',
        integrationsNow: 'سلة، زد',
        trialOffer: 'شهر مجاني كامل',
        yemenNext: 'تكامل مع الشركات المحلية',
        yemenPositioning: 'خدمة عملاء متميزة في اليمن',
        ctaEvery: 3,
        highIntentKeywords: ['ابدأ', 'سجّل', 'التقديم'],
        piiKeywords: ['اسم', 'هاتف', 'بريد'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with only some fields', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-02-01T00:00:00.000Z',
        ctaEvery: 5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate empty DTO', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('launchDate Validation', () => {
    it('should require valid ISO 8601 date format', async () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01T00:00:00.000Z', // Invalid month
        '2024-01-32T00:00:00.000Z', // Invalid day
        '2024-01-01', // Missing time
        '2024-01-01T25:00:00.000Z', // Invalid hour
        '2024-01-01T00:60:00.000Z', // Invalid minute
        '2024-01-01T00:00:60.000Z', // Invalid second
      ];

      for (const invalidDate of invalidDates) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          launchDate: invalidDate,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'launchDate')).toBe(
          true,
        );
      }
    });

    it('should accept valid ISO 8601 date formats', async () => {
      const validDates = [
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2025-06-15T12:30:45.123Z',
        '2024-02-29T12:00:00.000Z', // Leap year
      ];

      for (const validDate of validDates) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          launchDate: validDate,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle timezone information correctly', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-01-01T00:00:00+05:00',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle null and undefined values', async () => {
      const dtoNull = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: null,
      });

      const dtoUndefined = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: undefined,
      });

      const errorsNull = await validate(dtoNull);
      const errorsUndefined = await validate(dtoUndefined);

      expect(errorsNull).toHaveLength(0);
      expect(errorsUndefined).toHaveLength(0);
    });
  });

  describe('applyUrl Validation', () => {
    it('should require valid URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")',
        'https://',
        'http://',
        '://missing-protocol.com',
        'https://example.com/apply<script>',
      ];

      for (const invalidUrl of invalidUrls) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          applyUrl: invalidUrl,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'applyUrl')).toBe(
          true,
        );
      }
    });

    it('should accept valid URL formats', async () => {
      const validUrls = [
        'https://example.com/apply',
        'http://localhost:3000/apply',
        'https://subdomain.example.co.uk/apply',
        'https://example.com:8080/apply',
        'https://example.com/apply?utm_source=test&utm_medium=email',
        'https://example.com/apply?param=value&other=123',
      ];

      for (const validUrl of validUrls) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          applyUrl: validUrl,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle international domains', async () => {
      const internationalUrls = [
        'https://مثال.كوم/apply',
        'https://пример.рф/apply',
        'https://例子.中国/apply',
      ];

      for (const internationalUrl of internationalUrls) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          applyUrl: internationalUrl,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle null and undefined values', async () => {
      const dtoNull = plainToInstance(UpdateBotRuntimeSettingsDto, {
        applyUrl: null,
      });

      const dtoUndefined = plainToInstance(UpdateBotRuntimeSettingsDto, {
        applyUrl: undefined,
      });

      const errorsNull = await validate(dtoNull);
      const errorsUndefined = await validate(dtoUndefined);

      expect(errorsNull).toHaveLength(0);
      expect(errorsUndefined).toHaveLength(0);
    });
  });

  describe('ctaEvery Validation', () => {
    it('should require positive integer values', async () => {
      const invalidValues = [-1, -5, 0, 0.5, 1.5, '3', null, undefined];

      for (const invalidValue of invalidValues) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          ctaEvery: invalidValue,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Optional field
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'ctaEvery')).toBe(
          true,
        );
      }
    });

    it('should accept valid positive integers', async () => {
      const validValues = [1, 2, 3, 5, 10, 100, 1000];

      for (const validValue of validValues) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          ctaEvery: validValue,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle string number conversion', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        ctaEvery: '5',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.ctaEvery).toBe(5); // Should be converted to number
    });
  });

  describe('String Field Validation', () => {
    const stringFields = [
      'integrationsNow',
      'trialOffer',
      'yemenNext',
      'yemenPositioning',
    ];

    stringFields.forEach((field) => {
      describe(`${field} Validation`, () => {
        it(`should accept valid ${field}`, async () => {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: 'قيمة اختبار صالحة',
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        });

        it(`should accept null and undefined ${field}`, async () => {
          const dtoNull = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: null,
          });

          const dtoUndefined = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: undefined,
          });

          const errorsNull = await validate(dtoNull);
          const errorsUndefined = await validate(dtoUndefined);

          expect(errorsNull).toHaveLength(0);
          expect(errorsUndefined).toHaveLength(0);
        });

        it(`should handle special characters in ${field}`, async () => {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: 'قيمة مع رموز خاصة! @#$%^&*() وأرقام 123',
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        });

        it(`should handle unicode content in ${field}`, async () => {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: 'قيمة باللغة العربية مع أحرف يونيكود متطورة',
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        });

        it(`should handle very long ${field} values`, async () => {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: 'x'.repeat(10000),
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0); // Should not fail due to length
        });

        it(`should handle multiline ${field} values`, async () => {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            [field]: `سطر أول
سطر ثاني
سطر ثالث مع محتوى طويل جداً يحتوي على الكثير من النصوص والرموز الخاصة!`,
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        });
      });
    });
  });

  describe('Array Field Validation', () => {
    describe('highIntentKeywords Validation', () => {
      it('should require non-empty array when provided', async () => {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          highIntentKeywords: [],
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(
          errors.some((error) => error.property === 'highIntentKeywords'),
        ).toBe(true);
      });

      it('should accept valid keyword arrays', async () => {
        const validArrays = [
          ['ابدأ'],
          ['ابدأ', 'سجّل'],
          ['ابدأ', 'سجّل', 'التقديم', 'اطلب', 'تسجيل'],
          ['launch', 'start', 'apply', 'سعر', 'التكلفة'],
        ];

        for (const validArray of validArrays) {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            highIntentKeywords: validArray,
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should handle mixed language keywords', async () => {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          highIntentKeywords: [
            'ابدأ',
            'launch',
            'سجّل',
            'apply',
            'اطلب',
            'start',
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle special characters in keywords', async () => {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          highIntentKeywords: ['ابدأ!', 'سجّل🚀', 'اطلب💯', 'تسجيل⭐'],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle null and undefined values', async () => {
        const dtoNull = plainToInstance(UpdateBotRuntimeSettingsDto, {
          highIntentKeywords: null,
        });

        const dtoUndefined = plainToInstance(UpdateBotRuntimeSettingsDto, {
          highIntentKeywords: undefined,
        });

        const errorsNull = await validate(dtoNull);
        const errorsUndefined = await validate(dtoUndefined);

        expect(errorsNull).toHaveLength(0);
        expect(errorsUndefined).toHaveLength(0);
      });
    });

    describe('piiKeywords Validation', () => {
      it('should require non-empty array when provided', async () => {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          piiKeywords: [],
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'piiKeywords')).toBe(
          true,
        );
      });

      it('should accept valid PII keyword arrays', async () => {
        const validArrays = [
          ['اسم'],
          ['اسم', 'هاتف'],
          ['اسم', 'هاتف', 'بريد', 'عنوان'],
          ['phone', 'email', 'address', 'اسم', 'رقم'],
        ];

        for (const validArray of validArrays) {
          const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
            piiKeywords: validArray,
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should handle mixed language PII keywords', async () => {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          piiKeywords: ['name', 'phone', 'email', 'اسم', 'هاتف', 'بريد'],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle null and undefined values', async () => {
        const dtoNull = plainToInstance(UpdateBotRuntimeSettingsDto, {
          piiKeywords: null,
        });

        const dtoUndefined = plainToInstance(UpdateBotRuntimeSettingsDto, {
          piiKeywords: undefined,
        });

        const errorsNull = await validate(dtoNull);
        const errorsUndefined = await validate(dtoUndefined);

        expect(errorsNull).toHaveLength(0);
        expect(errorsUndefined).toHaveLength(0);
      });
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate complete realistic DTO', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-06-01T10:00:00.000Z',
        applyUrl:
          'https://kaleem-ai.com/apply?utm_source=website&utm_medium=banner',
        integrationsNow: 'سلة، زد، متجر إلكتروني متطور مع دعم API كامل',
        trialOffer:
          'احصل على شهر مجاني كامل! 💯 ثم باقة تجريبية محدودة وباقات مدفوعة بأسعار رمزية',
        yemenNext: 'تكامل مع شركات التوصيل المحلية 📦 + دفع إلكتروني آمن 💳',
        yemenPositioning:
          'يعالج فجوة خدمة العملاء بالمتاجر في اليمن ويُركّز على احتياجات السوق المحلي المتطورة 🇾🇪',
        ctaEvery: 4,
        highIntentKeywords: [
          'ابدأ',
          'سجّل',
          'التقديم',
          'اطلب',
          'تسجيل',
          'launch',
          'start',
          'apply',
          'سعر',
          'التكلفة',
          'كم السعر',
          'التكامل',
          'زد',
          'سلة',
          'اشتراك',
          'أشترك',
        ],
        piiKeywords: [
          'اسم',
          'رقم',
          'هاتف',
          'جوال',
          'واتساب',
          'ايميل',
          'البريد',
          'العنوان',
          'رقم الهوية',
          'تاريخ الميلاد',
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      // Verify transformation
      expect(dto.ctaEvery).toBe(4);
      expect(dto.highIntentKeywords).toHaveLength(16);
      expect(dto.piiKeywords).toHaveLength(10);
    });

    it('should handle partial updates correctly', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-03-01T00:00:00.000Z',
        ctaEvery: 7,
        highIntentKeywords: ['ابدأ', 'سجّل', 'اطلب'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.launchDate).toBe('2024-03-01T00:00:00.000Z');
      expect(dto.ctaEvery).toBe(7);
      expect(dto.highIntentKeywords).toEqual(['ابدأ', 'سجّل', 'اطلب']);
    });

    it('should handle concurrent field updates', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-04-01T00:00:00.000Z',
        applyUrl: 'https://new-domain.com/apply',
        integrationsNow: 'تحديث التكاملات',
        trialOffer: 'عرض تجريبي محدث',
        yemenNext: 'تطوير جديد',
        yemenPositioning: 'تحديث الموقع',
        ctaEvery: 6,
        highIntentKeywords: ['ابدأ', 'سجّل'],
        piiKeywords: ['اسم', 'هاتف'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.launchDate).toBe('2024-04-01T00:00:00.000Z');
      expect(dto.applyUrl).toBe('https://new-domain.com/apply');
      expect(dto.ctaEvery).toBe(6);
      expect(dto.highIntentKeywords).toEqual(['ابدأ', 'سجّل']);
      expect(dto.piiKeywords).toEqual(['اسم', 'هاتف']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely large arrays', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: Array(10000).fill('keyword'),
        piiKeywords: Array(10000).fill('pii-keyword'),
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.highIntentKeywords).toHaveLength(10000);
      expect(dto.piiKeywords).toHaveLength(10000);
    });

    it('should handle extremely long strings', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: 'x'.repeat(100000),
        trialOffer: 'y'.repeat(100000),
        yemenNext: 'z'.repeat(100000),
        yemenPositioning: 'w'.repeat(100000),
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.integrationsNow).toHaveLength(100000);
      expect(dto.trialOffer).toHaveLength(100000);
      expect(dto.yemenNext).toHaveLength(100000);
      expect(dto.yemenPositioning).toHaveLength(100000);
    });

    it('should handle special unicode characters', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: 'سلة، زد 🚀 مع دعم كامل للـ API 🌟',
        trialOffer: 'احصل على شهر مجاني كامل! 💯 ثم باقة تجريبية محدودة ⭐',
        yemenNext: 'تكامل مع شركات التوصيل المحلية 📦 + دفع إلكتروني آمن 💳',
        yemenPositioning:
          'يعالج فجوة خدمة العملاء بالمتاجر في اليمن 🇾🇪 ويُركّز على احتياجات السوق المحلي المتطورة',
        highIntentKeywords: ['ابدأ🚀', 'سجّل⭐', 'اطلب💯'],
        piiKeywords: ['اسم📞', 'هاتف📧', 'بريد🏠'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.integrationsNow).toContain('🚀');
      expect(dto.trialOffer).toContain('💯');
      expect(dto.yemenPositioning).toContain('🇾🇪');
      expect(dto.highIntentKeywords?.[0]).toBe('ابدأ🚀');
      expect(dto.piiKeywords?.[0]).toBe('اسم📞');
    });

    it('should handle empty and whitespace strings', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: '',
        trialOffer: '   ',
        yemenNext: '\t\n',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.integrationsNow).toBe('');
      expect(dto.trialOffer).toBe('   ');
      expect(dto.yemenNext).toBe('\t\n');
    });

    it('should handle zero and negative ctaEvery values', async () => {
      const invalidValues = [0, -1, -5, -100];

      for (const invalidValue of invalidValues) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          ctaEvery: invalidValue,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'ctaEvery')).toBe(
          true,
        );
      }
    });

    it('should handle floating point ctaEvery values', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        ctaEvery: 2.5,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'ctaEvery')).toBe(true);
    });

    it('should handle NaN and Infinity for ctaEvery', async () => {
      const invalidValues = [NaN, Infinity, -Infinity];

      for (const invalidValue of invalidValues) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          ctaEvery: invalidValue,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'ctaEvery')).toBe(
          true,
        );
      }
    });
  });

  describe('Transformation and Type Conversion', () => {
    it('should transform string numbers to numbers', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        ctaEvery: '5',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.ctaEvery).toBe(5); // Should be converted to number
    });

    it('should handle string arrays correctly', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: 'not_an_array',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) => error.property === 'highIntentKeywords'),
      ).toBe(true);
    });

    it('should handle mixed type arrays', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: ['ابدأ', 123, true, null],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) => error.property === 'highIntentKeywords'),
      ).toBe(true);
    });

    it('should handle nested objects in arrays', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: ['ابدأ', { nested: 'object' }, ['nested', 'array']],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) => error.property === 'highIntentKeywords'),
      ).toBe(true);
    });

    it('should preserve null and undefined in optional fields', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-01-01T00:00:00.000Z',
        applyUrl: null,
        integrationsNow: undefined,
        ctaEvery: 3,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.launchDate).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.applyUrl).toBeNull();
      expect(dto.integrationsNow).toBeUndefined();
      expect(dto.ctaEvery).toBe(3);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle typical settings update scenario', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-07-01T09:00:00.000Z',
        applyUrl: 'https://kaleem-ai.com/apply?source=updated',
        integrationsNow:
          'سلة، زد، متجر إلكتروني متطور مع دعم شامل للـ API وتكاملات متقدمة',
        trialOffer:
          'احصل على شهر مجاني كامل مع جميع المزايا! 💎 ثم اختر الباقة المناسبة لاحتياجاتك',
        ctaEvery: 4,
        highIntentKeywords: [
          'ابدأ',
          'سجّل',
          'التقديم',
          'اطلب',
          'تسجيل',
          'launch',
          'start',
          'apply',
          'سعر',
          'التكلفة',
          'كم السعر',
          'التكامل',
          'التطبيق',
          'المنصة',
        ],
        piiKeywords: [
          'اسم',
          'رقم',
          'هاتف',
          'جوال',
          'واتساب',
          'ايميل',
          'البريد',
          'العنوان',
          'رقم الهوية',
          'تاريخ الميلاد',
          'المدينة',
          'المحافظة',
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.launchDate).toBe('2024-07-01T09:00:00.000Z');
      expect(dto.ctaEvery).toBe(4);
      expect(dto.highIntentKeywords).toHaveLength(14);
      expect(dto.piiKeywords).toHaveLength(12);
    });

    it('should handle minimal update scenario', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        ctaEvery: 2,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.ctaEvery).toBe(2);
    });

    it('should handle localization update scenario', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        yemenPositioning:
          'نحن نقدم خدمة عملاء استثنائية في جميع أنحاء الجمهورية اليمنية مع التركيز على احتياجات السوق المحلي',
        integrationsNow:
          'سلة، زد، متجر، وأدوات أخرى محلية رائدة في السوق اليمني',
        trialOffer: 'جرب خدماتنا مجاناً لمدة شهر كامل في اليمن! 🇾🇪',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(dto.yemenPositioning).toContain('الجمهورية اليمنية');
      expect(dto.integrationsNow).toContain('السوق اليمني');
      expect(dto.trialOffer).toContain('🇾🇪');
    });
  });

  describe('Error Message Validation', () => {
    it('should provide meaningful error messages for launchDate', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: 'invalid-date',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const launchDateError = errors.find(
        (error) => error.property === 'launchDate',
      );
      expect(launchDateError).toBeDefined();
      expect(launchDateError?.constraints).toBeDefined();
    });

    it('should provide meaningful error messages for applyUrl', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        applyUrl: 'not-a-url',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const applyUrlError = errors.find(
        (error) => error.property === 'applyUrl',
      );
      expect(applyUrlError).toBeDefined();
      expect(applyUrlError?.constraints).toBeDefined();
    });

    it('should provide meaningful error messages for ctaEvery', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        ctaEvery: -1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const ctaEveryError = errors.find(
        (error) => error.property === 'ctaEvery',
      );
      expect(ctaEveryError).toBeDefined();
      expect(ctaEveryError?.constraints).toBeDefined();
    });

    it('should provide meaningful error messages for arrays', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const arrayError = errors.find(
        (error) => error.property === 'highIntentKeywords',
      );
      expect(arrayError).toBeDefined();
      expect(arrayError?.constraints).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle validation of large DTOs efficiently', async () => {
      const largeDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-01-01T00:00:00.000Z',
        applyUrl: 'https://example.com/apply',
        integrationsNow: 'x'.repeat(50000),
        trialOffer: 'y'.repeat(50000),
        yemenNext: 'z'.repeat(50000),
        yemenPositioning: 'w'.repeat(50000),
        ctaEvery: 100,
        highIntentKeywords: Array(5000).fill('keyword'),
        piiKeywords: Array(5000).fill('pii-keyword'),
      });

      const startTime = Date.now();
      const errors = await validate(largeDto);
      const endTime = Date.now();

      expect(errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple validations efficiently', async () => {
      const dtos: UpdateBotRuntimeSettingsDto[] = [];

      // Create multiple DTOs for batch validation
      for (let i = 0; i < 100; i++) {
        dtos.push(
          plainToInstance(UpdateBotRuntimeSettingsDto, {
            launchDate: `2024-01-0${(i % 9) + 1}T00:00:00.000Z`,
            ctaEvery: (i % 10) + 1,
            highIntentKeywords: [`keyword${i}`],
          }),
        );
      }

      const startTime = Date.now();

      const validationPromises = dtos.map((dto) => validate(dto));
      const results = await Promise.all(validationPromises);

      const endTime = Date.now();

      expect(results).toHaveLength(100);
      results.forEach((errors) => {
        expect(errors).toHaveLength(0);
      });
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Security and Sanitization', () => {
    it('should handle potential XSS attempts in text fields', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script>',
      ];

      for (const xssAttempt of xssAttempts) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          integrationsNow: xssAttempt,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Should not fail validation, but content may be sanitized elsewhere
      }
    });

    it('should handle SQL injection attempts in text fields', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1'; DELETE FROM settings; --",
        "'; UPDATE settings SET ctaEvery = 0; --",
      ];

      for (const sqlAttempt of sqlInjectionAttempts) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          trialOffer: sqlAttempt,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Should not fail validation, but content may be sanitized elsewhere
      }
    });

    it('should handle malformed URL attempts', async () => {
      const malformedUrls = [
        'https://example.com/apply<script>',
        'javascript:alert("xss")//example.com',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://user:pass@example.com/file',
      ];

      for (const malformedUrl of malformedUrls) {
        const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
          applyUrl: malformedUrl,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'applyUrl')).toBe(
          true,
        );
      }
    });

    it('should handle binary-like content in text fields', async () => {
      const binaryLikeContent = Buffer.from(
        'test content with binary data',
      ).toString('base64');

      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: binaryLikeContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle extremely long malicious content', async () => {
      const maliciousContent =
        'x'.repeat(100000) + '<script>alert("xss")</script>';

      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: maliciousContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Should not fail validation
    });
  });

  describe('Business Logic Validation', () => {
    it('should support Yemen-specific business requirements', async () => {
      const yemenSpecificDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        yemenNext:
          'تكامل مع شركات الشحن اليمنية مثل Yemen Post وشركات النقل المحلية',
        yemenPositioning:
          'نحن الخيار الأول للمتاجر اليمنية في مجال خدمة العملاء الآلية',
        integrationsNow: 'سلة، زد، متجر، ومنصات يمنية أخرى',
        highIntentKeywords: [
          'ابدأ',
          'سجّل',
          'اطلب',
          'تسجيل',
          'يمني',
          'متجر يمني',
          'تجارة إلكترونية يمنية',
        ],
      });

      const errors = await validate(yemenSpecificDto);
      expect(errors).toHaveLength(0);

      expect(yemenSpecificDto.yemenNext).toContain('يمنية');
      expect(yemenSpecificDto.yemenPositioning).toContain('اليمنية');
      expect(yemenSpecificDto.integrationsNow).toContain('يمنية');
      expect(yemenSpecificDto.highIntentKeywords).toContain('يمني');
    });

    it('should support pricing and cost-related keywords', async () => {
      const pricingDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: [
          'سعر',
          'التكلفة',
          'كم السعر',
          'التسعير',
          'الأسعار',
          'تكلفة',
          'رسوم',
          'تكلفة الاشتراك',
          'سعر الباقة',
          'كم تكلفة',
          'price',
          'cost',
          'pricing',
          'fees',
        ],
      });

      const errors = await validate(pricingDto);
      expect(errors).toHaveLength(0);

      expect(pricingDto.highIntentKeywords).toContain('سعر');
      expect(pricingDto.highIntentKeywords).toContain('التكلفة');
      expect(pricingDto.highIntentKeywords).toContain('price');
      expect(pricingDto.highIntentKeywords).toContain('cost');
    });

    it('should support technical integration keywords', async () => {
      const technicalDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: 'تكامل متطور مع سلة، زد، متجر، Shopify، WooCommerce',
        highIntentKeywords: [
          'التكامل',
          'API',
          'تطبيق',
          'اندرويد',
          'iOS',
          'ويب',
          'تطبيق الويب',
          'تطبيق الموبايل',
          'اندرويد',
          'ايفون',
          'موبايل',
          'ويب سايت',
        ],
      });

      const errors = await validate(technicalDto);
      expect(errors).toHaveLength(0);

      expect(technicalDto.integrationsNow).toContain('API');
      expect(technicalDto.integrationsNow).toContain('Shopify');
      expect(technicalDto.highIntentKeywords).toContain('التكامل');
      expect(technicalDto.highIntentKeywords).toContain('API');
      expect(technicalDto.highIntentKeywords).toContain('موبايل');
    });
  });

  describe('Data Type Flexibility', () => {
    it('should handle mixed data types in arrays', async () => {
      const mixedArrayDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        highIntentKeywords: [
          'ابدأ',
          123, // This should fail validation
          true, // This should fail validation
          null, // This should fail validation
          'سجّل',
        ],
      });

      const errors = await validate(mixedArrayDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) => error.property === 'highIntentKeywords'),
      ).toBe(true);
    });

    it('should handle string numbers in numeric fields', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        ctaEvery: '5',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.ctaEvery).toBe(5); // Should be converted to number
    });

    it('should handle boolean values in string fields', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        integrationsNow: true as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'integrationsNow')).toBe(
        true,
      );
    });

    it('should handle object values in string fields', async () => {
      const dto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        trialOffer: { nested: 'object' } as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'trialOffer')).toBe(
        true,
      );
    });
  });

  describe('Validation Constraints Summary', () => {
    it('should enforce all validation rules correctly', async () => {
      // Test a comprehensive set of validation rules
      const comprehensiveDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: 'invalid-date',
        applyUrl: 'not-a-url',
        integrationsNow: 123, // Should be string
        trialOffer: true, // Should be string
        yemenNext: [], // Should be string
        yemenPositioning: {}, // Should be string
        ctaEvery: -1, // Should be positive integer
        highIntentKeywords: 'not-an-array', // Should be array
        piiKeywords: 123, // Should be array
      });

      const errors = await validate(comprehensiveDto);

      // Should have multiple validation errors
      expect(errors.length).toBeGreaterThan(5);

      // Check that all expected fields have errors
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('launchDate');
      expect(errorProperties).toContain('applyUrl');
      expect(errorProperties).toContain('integrationsNow');
      expect(errorProperties).toContain('trialOffer');
      expect(errorProperties).toContain('yemenNext');
      expect(errorProperties).toContain('yemenPositioning');
      expect(errorProperties).toContain('ctaEvery');
      expect(errorProperties).toContain('highIntentKeywords');
      expect(errorProperties).toContain('piiKeywords');
    });

    it('should pass validation with all valid data', async () => {
      const validDto = plainToInstance(UpdateBotRuntimeSettingsDto, {
        launchDate: '2024-12-01T00:00:00.000Z',
        applyUrl: 'https://valid-url.com/apply',
        integrationsNow: 'سلة، زد، متجر صالح',
        trialOffer: 'عرض صالح',
        yemenNext: 'تطوير صالح',
        yemenPositioning: 'موقع صالح',
        ctaEvery: 3,
        highIntentKeywords: ['ابدأ', 'سجّل'],
        piiKeywords: ['اسم', 'هاتف'],
      });

      const errors = await validate(validDto);
      expect(errors).toHaveLength(0);

      // Verify all values are correct
      expect(validDto.launchDate).toBe('2024-12-01T00:00:00.000Z');
      expect(validDto.applyUrl).toBe('https://valid-url.com/apply');
      expect(validDto.ctaEvery).toBe(3);
      expect(validDto.highIntentKeywords).toEqual(['ابدأ', 'سجّل']);
      expect(validDto.piiKeywords).toEqual(['اسم', 'هاتف']);
    });
  });
});
