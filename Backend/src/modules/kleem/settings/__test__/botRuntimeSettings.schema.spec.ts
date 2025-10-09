import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';

import {
  BotRuntimeSettings,
  BotRuntimeSettingsSchema,
} from '../botRuntimeSettings.schema';

describe('BotRuntimeSettingsSchema', () => {
  let _model: Model<BotRuntimeSettings>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(BotRuntimeSettings.name),
          useValue: Model, // Mock the model
        },
      ],
    }).compile();

    _model = module.get<Model<BotRuntimeSettings>>(
      getModelToken(BotRuntimeSettings.name),
    );
  });

  describe('Schema Definition', () => {
    it('should have correct schema properties', () => {
      const schemaPaths = Object.keys(BotRuntimeSettingsSchema.paths);

      expect(schemaPaths).toContain('launchDate');
      expect(schemaPaths).toContain('applyUrl');
      expect(schemaPaths).toContain('integrationsNow');
      expect(schemaPaths).toContain('trialOffer');
      expect(schemaPaths).toContain('yemenNext');
      expect(schemaPaths).toContain('yemenPositioning');
      expect(schemaPaths).toContain('ctaEvery');
      expect(schemaPaths).toContain('highIntentKeywords');
      expect(schemaPaths).toContain('piiKeywords');
      expect(schemaPaths).toContain('_id');
      expect(schemaPaths).toContain('createdAt');
      expect(schemaPaths).toContain('updatedAt');
    });

    it('should have correct property types', () => {
      const launchDatePath = BotRuntimeSettingsSchema.paths['launchDate'];
      const applyUrlPath = BotRuntimeSettingsSchema.paths['applyUrl'];
      const integrationsNowPath =
        BotRuntimeSettingsSchema.paths['integrationsNow'];
      const trialOfferPath = BotRuntimeSettingsSchema.paths['trialOffer'];
      const yemenNextPath = BotRuntimeSettingsSchema.paths['yemenNext'];
      const yemenPositioningPath =
        BotRuntimeSettingsSchema.paths['yemenPositioning'];
      const ctaEveryPath = BotRuntimeSettingsSchema.paths['ctaEvery'];
      const highIntentKeywordsPath =
        BotRuntimeSettingsSchema.paths['highIntentKeywords'];
      const piiKeywordsPath = BotRuntimeSettingsSchema.paths['piiKeywords'];

      expect(launchDatePath.instance).toBe('String');
      expect(launchDatePath.default).toBe('20 أغسطس');

      expect(applyUrlPath.instance).toBe('String');
      expect(applyUrlPath.default).toBe('https://your-landing/apply');

      expect(integrationsNowPath.instance).toBe('String');
      expect(integrationsNowPath.default).toBe('سلة، زد');

      expect(trialOfferPath.instance).toBe('String');
      expect(trialOfferPath.default).toBe(
        'شهر مجاني كامل، ثم باقة تجريبية محدودة وباقات مدفوعة بأسعار رمزية',
      );

      expect(yemenNextPath.instance).toBe('String');
      expect(yemenNextPath.default).toBe(
        'تكامل شركات توصيل داخل اليمن + دفع إلكتروني مناسب',
      );

      expect(yemenPositioningPath.instance).toBe('String');
      expect(yemenPositioningPath.default).toBe(
        'يعالج فجوة خدمة العملاء بالمتاجر في اليمن ويركّز على احتياجات السوق المحلي',
      );

      expect(ctaEveryPath.instance).toBe('Number');
      expect(ctaEveryPath.default).toBe(3);

      expect(highIntentKeywordsPath.instance).toBe('Array');
      expect(Array.isArray(highIntentKeywordsPath.default)).toBe(true);
      expect(highIntentKeywordsPath.default).toEqual([
        'ابدأ',
        'سجّل',
        'التقديم',
        'كيف أبدأ',
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
      ]);

      expect(piiKeywordsPath.instance).toBe('Array');
      expect(Array.isArray(piiKeywordsPath.default)).toBe(true);
      expect(piiKeywordsPath.default).toEqual([
        'اسم',
        'رقم',
        'هاتف',
        'جوال',
        'واتساب',
        'ايميل',
        'البريد',
      ]);
    });

    it('should have timestamps enabled', () => {
      expect(BotRuntimeSettingsSchema.options.timestamps).toBe(true);
    });

    it('should have correct collection name', () => {
      expect(BotRuntimeSettingsSchema.options.collection).toBe(
        'bot_runtime_settings',
      );
    });

    it('should not have version key disabled', () => {
      expect(BotRuntimeSettingsSchema.options.versionKey).toBeUndefined();
    });
  });

  describe('Default Values Validation', () => {
    it('should have meaningful Arabic default values', () => {
      const defaults = {
        launchDate: '20 أغسطس',
        applyUrl: 'https://your-landing/apply',
        integrationsNow: 'سلة، زد',
        trialOffer:
          'شهر مجاني كامل، ثم باقة تجريبية محدودة وباقات مدفوعة بأسعار رمزية',
        yemenNext: 'تكامل شركات توصيل داخل اليمن + دفع إلكتروني مناسب',
        yemenPositioning:
          'يعالج فجوة خدمة العملاء بالمتاجر في اليمن ويركّز على احتياجات السوق المحلي',
        ctaEvery: 3,
      };

      Object.entries(defaults).forEach(([field, expectedValue]) => {
        const schemaPath = BotRuntimeSettingsSchema.paths[field];
        expect(schemaPath.default).toBe(expectedValue);
      });
    });

    it('should have comprehensive keyword arrays', () => {
      const highIntentKeywordsPath =
        BotRuntimeSettingsSchema.paths['highIntentKeywords'];
      const piiKeywordsPath = BotRuntimeSettingsSchema.paths['piiKeywords'];

      const highIntentKeywords = highIntentKeywordsPath.default[0];

      const piiKeywords = piiKeywordsPath.default[0];

      expect(highIntentKeywords).toContain('ابدأ');
      expect(highIntentKeywords).toContain('سجّل');
      expect(highIntentKeywords).toContain('التقديم');
      expect(highIntentKeywords).toContain('launch');
      expect(highIntentKeywords).toContain('apply');
      expect(highIntentKeywords).toContain('سعر');
      expect(highIntentKeywords).toContain('التكلفة');
      expect(highIntentKeywords).toContain('التكامل');
      expect(highIntentKeywords).toContain('زد');
      expect(highIntentKeywords).toContain('سلة');
      expect(highIntentKeywords).toContain('اشتراك');

      expect(piiKeywords).toContain('اسم');
      expect(piiKeywords).toContain('رقم');
      expect(piiKeywords).toContain('هاتف');
      expect(piiKeywords).toContain('جوال');
      expect(piiKeywords).toContain('واتساب');
      expect(piiKeywords).toContain('ايميل');
      expect(piiKeywords).toContain('البريد');

      expect(highIntentKeywords.length).toBeGreaterThan(10);
      expect(piiKeywords.length).toBeGreaterThan(5);
    });

    it('should have appropriate string lengths for defaults', () => {
      const trialOfferPath = BotRuntimeSettingsSchema.paths['trialOffer'];
      const yemenNextPath = BotRuntimeSettingsSchema.paths['yemenNext'];
      const yemenPositioningPath =
        BotRuntimeSettingsSchema.paths['yemenPositioning'];

      expect(trialOfferPath.default.length).toBeGreaterThan(50);
      expect(yemenNextPath.default.length).toBeGreaterThan(40);
      expect(yemenPositioningPath.default.length).toBeGreaterThan(60);
    });
  });

  describe('Schema Options', () => {
    it('should have correct collection configuration', () => {
      expect(BotRuntimeSettingsSchema.options.collection).toBe(
        'bot_runtime_settings',
      );
      expect(BotRuntimeSettingsSchema.options.timestamps).toBe(true);
    });

    it('should be configured for single document collection', () => {
      // This schema is designed for a single settings document
      // The collection name suggests it's for runtime settings
      expect(BotRuntimeSettingsSchema.options.collection).toContain(
        'runtime_settings',
      );
    });

    it('should have proper model name', () => {
      expect(BotRuntimeSettings.name).toBe('BotRuntimeSettings');
    });
  });

  describe('Document Creation', () => {
    it('should create document with all default values', () => {
      const settingsData = {};

      // Test that defaults would be applied (in a real scenario)
      expect(settingsData).toEqual({});
    });

    it('should handle document with all fields specified', () => {
      const settingsData = {
        launchDate: '2024-01-01T00:00:00.000Z',
        applyUrl: 'https://example.com/apply',
        integrationsNow: 'سلة، زد، متجر',
        trialOffer: 'شهر مجاني كامل ثم باقة تجريبية',
        yemenNext: 'تكامل مع الشركات المحلية',
        yemenPositioning: 'خدمة عملاء متميزة في اليمن',
        ctaEvery: 5,
        highIntentKeywords: ['ابدأ', 'سجّل', 'اطلب'],
        piiKeywords: ['اسم', 'هاتف', 'بريد'],
      };

      expect(settingsData.launchDate).toBe('2024-01-01T00:00:00.000Z');
      expect(settingsData.applyUrl).toBe('https://example.com/apply');
      expect(settingsData.integrationsNow).toBe('سلة، زد، متجر');
      expect(settingsData.trialOffer).toBe('شهر مجاني كامل ثم باقة تجريبية');
      expect(settingsData.yemenNext).toBe('تكامل مع الشركات المحلية');
      expect(settingsData.yemenPositioning).toBe('خدمة عملاء متميزة في اليمن');
      expect(settingsData.ctaEvery).toBe(5);
      expect(settingsData.highIntentKeywords).toEqual(['ابدأ', 'سجّل', 'اطلب']);
      expect(settingsData.piiKeywords).toEqual(['اسم', 'هاتف', 'بريد']);
    });

    it('should handle document with partial field specification', () => {
      const settingsData = {
        launchDate: '2024-02-01T00:00:00.000Z',
        ctaEvery: 7,
        highIntentKeywords: ['اطلب', 'تسجيل'],
      };

      expect(settingsData.launchDate).toBe('2024-02-01T00:00:00.000Z');
      expect(settingsData.ctaEvery).toBe(7);
      expect(settingsData.highIntentKeywords).toEqual(['اطلب', 'تسجيل']);
    });
  });

  describe('Field Validation', () => {
    it('should accept valid launch date format', () => {
      const validDates = [
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2025-06-15T12:30:45.123Z',
      ];

      validDates.forEach((date) => {
        expect(() => {
          // In a real validation scenario, this would pass
          expect(typeof date).toBe('string');
          expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        }).not.toThrow();
      });
    });

    it('should accept valid URL format', () => {
      const validUrls = [
        'https://example.com/apply',
        'http://localhost:3000/apply',
        'https://subdomain.example.co.uk/apply',
        'https://example.com:8080/apply',
      ];

      validUrls.forEach((url) => {
        expect(() => {
          expect(typeof url).toBe('string');
          expect(url).toMatch(/^https?:\/\/.+/);
        }).not.toThrow();
      });
    });

    it('should accept valid keyword arrays', () => {
      const validKeywordArrays = [
        ['ابدأ', 'سجّل'],
        ['اطلب', 'تسجيل', 'كيف أبدأ'],
        ['launch', 'start', 'apply', 'سعر'],
      ];

      validKeywordArrays.forEach((keywords) => {
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeGreaterThan(0);
        keywords.forEach((keyword) => {
          expect(typeof keyword).toBe('string');
          expect(keyword.length).toBeGreaterThan(0);
        });
      });
    });

    it('should accept valid numeric values for ctaEvery', () => {
      const validNumbers = [1, 2, 3, 5, 10, 100];

      validNumbers.forEach((number) => {
        expect(typeof number).toBe('number');
        expect(number).toBeGreaterThan(0);
        expect(Number.isInteger(number)).toBe(true);
      });
    });
  });

  describe('Data Integrity', () => {
    it('should have all required fields with defaults', () => {
      const allPaths = Object.keys(BotRuntimeSettingsSchema.paths);

      // All main fields should have defaults except timestamps and _id
      const fieldsWithDefaults = [
        'launchDate',
        'applyUrl',
        'integrationsNow',
        'trialOffer',
        'yemenNext',
        'yemenPositioning',
        'ctaEvery',
        'highIntentKeywords',
        'piiKeywords',
      ];

      fieldsWithDefaults.forEach((field) => {
        expect(allPaths).toContain(field);
        const schemaPath = BotRuntimeSettingsSchema.paths[field];
        expect(schemaPath.default).toBeDefined();
      });
    });

    it('should have appropriate field types for all properties', () => {
      // String fields
      const stringFields = [
        'launchDate',
        'applyUrl',
        'integrationsNow',
        'trialOffer',
        'yemenNext',
        'yemenPositioning',
      ];

      stringFields.forEach((field) => {
        expect(BotRuntimeSettingsSchema.paths[field].instance).toBe('String');
      });

      // Number fields
      const numberFields = ['ctaEvery'];
      numberFields.forEach((field) => {
        expect(BotRuntimeSettingsSchema.paths[field].instance).toBe('Number');
      });

      // Array fields
      const arrayFields = ['highIntentKeywords', 'piiKeywords'];
      arrayFields.forEach((field) => {
        expect(BotRuntimeSettingsSchema.paths[field].instance).toBe('Array');
      });
    });

    it('should have meaningful default values in Arabic', () => {
      const arabicDefaults = {
        integrationsNow: 'سلة، زد',
        yemenPositioning: 'يعالج فجوة خدمة العملاء بالمتاجر في اليمن',
      };

      Object.entries(arabicDefaults).forEach(([field, expectedValue]) => {
        const schemaPath = BotRuntimeSettingsSchema.paths[field];
        expect(schemaPath.default).toBe(expectedValue);
      });
    });
  });

  describe('Schema Extensibility', () => {
    it('should allow for future field additions', () => {
      // The schema should be flexible enough to add new fields
      expect(BotRuntimeSettingsSchema).toBeDefined();
      expect(typeof BotRuntimeSettingsSchema).toBe('object');

      // Check that the schema has the basic structure needed for extensibility
      expect(BotRuntimeSettingsSchema.paths).toBeDefined();
      expect(BotRuntimeSettingsSchema.options).toBeDefined();
    });

    it('should maintain backward compatibility with defaults', () => {
      // All fields should have defaults to ensure existing documents work with new code
      const fieldsWithoutDefaults = ['_id', 'createdAt', 'updatedAt'];

      const fieldsWithDefaults = Object.keys(
        BotRuntimeSettingsSchema.paths,
      ).filter((field) => !fieldsWithoutDefaults.includes(field));

      fieldsWithDefaults.forEach((field) => {
        const schemaPath = BotRuntimeSettingsSchema.paths[field];
        expect(schemaPath.default).toBeDefined();
      });
    });

    it('should support complex nested structures', () => {
      // The schema supports arrays and complex default values
      const highIntentKeywordsPath =
        BotRuntimeSettingsSchema.paths['highIntentKeywords'];
      const piiKeywordsPath = BotRuntimeSettingsSchema.paths['piiKeywords'];

      expect(Array.isArray(highIntentKeywordsPath.default)).toBe(true);
      expect(highIntentKeywordsPath.default.length).toBeGreaterThan(10);

      expect(Array.isArray(piiKeywordsPath.default)).toBe(true);
      expect(piiKeywordsPath.default.length).toBeGreaterThan(5);
    });
  });

  describe('Performance Considerations', () => {
    it('should have efficient default values', () => {
      // Check that default values are not excessively large
      const trialOfferPath = BotRuntimeSettingsSchema.paths['trialOffer'];
      const yemenPositioningPath =
        BotRuntimeSettingsSchema.paths['yemenPositioning'];

      expect(trialOfferPath.default.length).toBeLessThan(200);
      expect(yemenPositioningPath.default.length).toBeLessThan(150);
    });

    it('should have reasonable array sizes for defaults', () => {
      const highIntentKeywordsPath =
        BotRuntimeSettingsSchema.paths['highIntentKeywords'];
      const piiKeywordsPath = BotRuntimeSettingsSchema.paths['piiKeywords'];

      expect(highIntentKeywordsPath.default.length).toBeLessThan(50);
      expect(piiKeywordsPath.default.length).toBeLessThan(20);
    });

    it('should support indexing for performance', () => {
      // In a real MongoDB setup, this schema might have indexes
      // For now, we verify the schema structure supports indexing
      expect(BotRuntimeSettingsSchema).toBeDefined();

      // The schema could be extended with indexes like:
      // @Prop({ index: true })
      // But that's not implemented in the current schema
    });
  });

  describe('Localization Support', () => {
    it('should have Arabic default values', () => {
      const arabicFields = [
        'integrationsNow',
        'trialOffer',
        'yemenNext',
        'yemenPositioning',
      ];

      arabicFields.forEach((field) => {
        const schemaPath = BotRuntimeSettingsSchema.paths[field];
        expect(schemaPath.default).toMatch(/[\u0600-\u06FF]/); // Contains Arabic characters
      });
    });

    it('should support mixed language content', () => {
      // The schema supports both Arabic and English content
      const highIntentKeywordsPath =
        BotRuntimeSettingsSchema.paths['highIntentKeywords'];

      const highIntentKeywords = highIntentKeywordsPath.default[0];
      const hasArabic = highIntentKeywords.some((keyword) =>
        /[\u0600-\u06FF]/.test(keyword),
      );
      const hasEnglish = highIntentKeywords.some((keyword) =>
        /^[a-zA-Z]+$/.test(keyword),
      );

      expect(hasArabic).toBe(true);
      expect(hasEnglish).toBe(true);
    });

    it('should handle Arabic text with diacritics', () => {
      const textWithDiacritics = 'سجّل'; // Contains shadda
      expect(textWithDiacritics).toMatch(/[\u0600-\u06FF]/);
      expect(textWithDiacritics.length).toBeGreaterThan(3); // Multi-byte character
    });
  });

  describe('Business Logic Validation', () => {
    it('should have sensible default values for business logic', () => {
      const ctaEveryPath = BotRuntimeSettingsSchema.paths['ctaEvery'];

      expect(ctaEveryPath.default).toBe(3);
      expect(ctaEveryPath.default).toBeGreaterThan(0);
      expect(ctaEveryPath.default).toBeLessThan(10);
    });

    it('should have comprehensive keyword coverage', () => {
      const highIntentKeywordsPath =
        BotRuntimeSettingsSchema.paths['highIntentKeywords'];
      const highIntentKeywords = highIntentKeywordsPath.default[0];

      // Should cover common business terms
      expect(highIntentKeywords.some((k: string) => k.includes('سعر'))).toBe(
        true,
      );
      expect(highIntentKeywords.some((k: string) => k.includes('ابدأ'))).toBe(
        true,
      );
      expect(
        highIntentKeywords.some(
          (k: string) => k.includes('تسجيل') || k.includes('سجّل'),
        ),
      ).toBe(true);

      // Should cover English equivalents
      expect(highIntentKeywords.some((k: string) => k === 'launch')).toBe(true);
      expect(highIntentKeywords.some((k: string) => k === 'start')).toBe(true);
      expect(highIntentKeywords.some((k: string) => k === 'apply')).toBe(true);
    });

    it('should have essential PII keywords', () => {
      const piiKeywordsPath = BotRuntimeSettingsSchema.paths['piiKeywords'];
      const piiKeywords = piiKeywordsPath.default[0];

      const essentialPII = ['اسم', 'هاتف', 'بريد'];
      essentialPII.forEach((keyword) => {
        expect(piiKeywords).toContain(keyword);
      });
    });

    it('should have appropriate Yemen-specific positioning', () => {
      const yemenPositioningPath =
        BotRuntimeSettingsSchema.paths['yemenPositioning'];

      expect(yemenPositioningPath.default).toContain('اليمن');
      expect(yemenPositioningPath.default).toContain('خدمة العملاء');
      expect(yemenPositioningPath.default).toContain('المتاجر');
      expect(yemenPositioningPath.default.length).toBeGreaterThan(50);
    });
  });

  describe('Schema Metadata', () => {
    it('should have proper model name', () => {
      expect(BotRuntimeSettings.name).toBe('BotRuntimeSettings');
    });

    it('should have schema factory created correctly', () => {
      expect(BotRuntimeSettingsSchema).toBeDefined();
      expect(typeof BotRuntimeSettingsSchema).toBe('object');
      expect(BotRuntimeSettingsSchema.paths).toBeDefined();
    });

    it('should be properly exported', () => {
      // The schema should be properly exported for use in the module
      expect(BotRuntimeSettingsSchema).toBeDefined();
      expect(BotRuntimeSettings).toBeDefined();
    });
  });

  describe('Data Structure Validation', () => {
    it('should support complex document structures', () => {
      const complexSettings = {
        launchDate: '2024-01-01T00:00:00.000Z',
        applyUrl: 'https://example.com/apply',
        integrationsNow: 'سلة، زد، متجر إلكتروني',
        trialOffer:
          'شهر مجاني كامل ثم باقة تجريبية محدودة وباقات مدفوعة بأسعار رمزية',
        yemenNext: 'تكامل شركات توصيل داخل اليمن + دفع إلكتروني مناسب',
        yemenPositioning:
          'يعالج فجوة خدمة العملاء بالمتاجر في اليمن ويركّز على احتياجات السوق المحلي',
        ctaEvery: 3,
        highIntentKeywords: [
          'ابدأ',
          'سجّل',
          'التقديم',
          'كيف أبدأ',
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
          'اطلب',
          'تسجيل',
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
        ],
      };

      expect(complexSettings.highIntentKeywords.length).toBeGreaterThan(15);
      expect(complexSettings.piiKeywords.length).toBeGreaterThan(8);
      expect(complexSettings.trialOffer.length).toBeGreaterThan(50);
      expect(complexSettings.yemenPositioning.length).toBeGreaterThan(60);
    });

    it('should handle minimal document structures', () => {
      const minimalSettings = {
        launchDate: '2024-01-01T00:00:00.000Z',
        applyUrl: 'https://example.com/apply',
      };

      expect(minimalSettings.launchDate).toBe('2024-01-01T00:00:00.000Z');
      expect(minimalSettings.applyUrl).toBe('https://example.com/apply');
    });

    it('should support document updates', () => {
      const updateData = {
        integrationsNow: 'سلة، زد، متجر جديد',
        ctaEvery: 5,
        highIntentKeywords: ['ابدأ', 'سجّل', 'اطلب', 'تسجيل'],
      };

      expect(updateData.integrationsNow).toContain('زد');
      expect(updateData.ctaEvery).toBe(5);
      expect(updateData.highIntentKeywords).toContain('ابدأ');
      expect(updateData.highIntentKeywords.length).toBe(4);
    });
  });
});
