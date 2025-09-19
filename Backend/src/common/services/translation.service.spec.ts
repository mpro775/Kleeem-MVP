import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let i18nService: I18nService;

  beforeEach(async () => {
    const mockI18nService = {
      translate: jest.fn((key: string, args?: any) => {
        // Mock translation - return key if no translation found
        return `translated_${key}`;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
    i18nService = module.get<I18nService>(I18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translate', () => {
    it('should translate a simple key', () => {
      const result = service.translate('test.key');
      expect(result).toBe('translated_test.key');
    });

    it('should handle translation errors gracefully', () => {
      const mockI18nService = {
        translate: jest.fn(() => {
          throw new Error('Translation error');
        }),
      };

      const module = Test.createTestingModule({
        providers: [
          TranslationService,
          {
            provide: I18nService,
            useValue: mockI18nService,
          },
        ],
      });

      const testService = module.get(TranslationService);
      const result = testService.translate('error.key');
      expect(result).toBe('error.key'); // Should return original key
    });
  });

  describe('translateError', () => {
    it('should translate error messages', () => {
      const result = service.translateError('notFound');
      expect(result).toBe('translated_errors.notFound');
    });
  });

  describe('translateSuccess', () => {
    it('should translate success messages', () => {
      const result = service.translateSuccess('dataSaved');
      expect(result).toBe('translated_messages.success.dataSaved');
    });
  });

  describe('translateValidation', () => {
    it('should translate validation messages', () => {
      const result = service.translateValidation('required');
      expect(result).toBe('translated_validation.required');
    });
  });

  describe('translateProduct', () => {
    it('should translate product messages', () => {
      const result = service.translateProduct('errors.notFound');
      expect(result).toBe('translated_products.errors.notFound');
    });
  });

  describe('translateMerchant', () => {
    it('should translate merchant messages', () => {
      const result = service.translateMerchant('errors.notFound');
      expect(result).toBe('translated_merchants.errors.notFound');
    });
  });

  describe('translateUser', () => {
    it('should translate user messages', () => {
      const result = service.translateUser('errors.userNotFound');
      expect(result).toBe('translated_users.errors.userNotFound');
    });
  });

  describe('translateAuth', () => {
    it('should translate auth messages', () => {
      const result = service.translateAuth('login.title');
      expect(result).toBe('translated_auth.login.title');
    });
  });

  describe('translateAuthMessage', () => {
    it('should translate auth messages by type', () => {
      const result = service.translateAuthMessage(
        'errors',
        'invalidCredentials',
      );
      expect(result).toBe('translated_auth.errors.invalidCredentials');
    });
  });

  describe('translateProductMessage', () => {
    it('should translate product messages by type', () => {
      const result = service.translateProductMessage('errors', 'notFound');
      expect(result).toBe('translated_products.errors.notFound');
    });
  });

  describe('translateMerchantMessage', () => {
    it('should translate merchant messages by type', () => {
      const result = service.translateMerchantMessage('errors', 'notFound');
      expect(result).toBe('translated_merchants.errors.notFound');
    });
  });

  describe('getCurrentLanguage', () => {
    it('should return default language', () => {
      const result = service.getCurrentLanguage();
      expect(result).toBe('ar');
    });
  });

  describe('hasTranslation', () => {
    it('should check if translation exists', () => {
      const result = service.hasTranslation('test.key');
      expect(result).toBe(true);
    });

    it('should handle missing translations', () => {
      const mockI18nService = {
        translate: jest.fn(() => {
          throw new Error('Translation not found');
        }),
      };

      const module = Test.createTestingModule({
        providers: [
          TranslationService,
          {
            provide: I18nService,
            useValue: mockI18nService,
          },
        ],
      });

      const testService = module.get(TranslationService);
      const result = testService.hasTranslation('missing.key');
      expect(result).toBe(false);
    });
  });

  describe('translateMultiple', () => {
    it('should translate multiple keys', () => {
      const keys = ['test.key1', 'test.key2'];
      const result = service.translateMultiple(keys);

      expect(result).toEqual({
        'test.key1': 'translated_test.key1',
        'test.key2': 'translated_test.key2',
      });
    });
  });

  describe('translateWithFallback', () => {
    it('should return translation if available', () => {
      const result = service.translateWithFallback('test.key', 'fallback');
      expect(result).toBe('translated_test.key');
    });

    it('should return fallback if translation fails', () => {
      const mockI18nService = {
        translate: jest.fn(() => {
          throw new Error('Translation error');
        }),
      };

      const module = Test.createTestingModule({
        providers: [
          TranslationService,
          {
            provide: I18nService,
            useValue: mockI18nService,
          },
        ],
      });

      const testService = module.get(TranslationService);
      const result = testService.translateWithFallback(
        'missing.key',
        'fallback text',
      );
      expect(result).toBe('fallback text');
    });
  });

  describe('translateArray', () => {
    it('should translate array of keys', () => {
      const keys = ['test.key1', 'test.key2'];
      const result = service.translateArray(keys);

      expect(result).toEqual(['translated_test.key1', 'translated_test.key2']);
    });
  });
});
