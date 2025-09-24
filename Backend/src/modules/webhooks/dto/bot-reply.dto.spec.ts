import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { BotReplyDto } from './bot-reply.dto';

describe('BotReplyDto', () => {
  describe('Validation', () => {
    it('should validate valid BotReplyDto', async () => {
      const validDto = {
        sessionId: 'session-123',
        text: 'مرحباً، كيف يمكنني مساعدتك؟',
        metadata: { source: 'bot_engine', confidence: 0.95 },
      };

      const dto = plainToClass(BotReplyDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate BotReplyDto without metadata', async () => {
      const validDto = {
        sessionId: 'session-456',
        text: 'رد بسيط بدون metadata',
      };

      const dto = plainToClass(BotReplyDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation when sessionId is missing', async () => {
      const invalidDto = {
        text: 'رد بدون sessionId',
        metadata: { source: 'test' },
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('sessionId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when text is missing', async () => {
      const invalidDto = {
        sessionId: 'session-123',
        metadata: { source: 'test' },
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('text');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when sessionId is empty string', async () => {
      const invalidDto = {
        sessionId: '',
        text: 'رد مع sessionId فارغ',
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('sessionId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when text is empty string', async () => {
      const invalidDto = {
        sessionId: 'session-123',
        text: '',
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('text');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when sessionId is not string', async () => {
      const invalidDto = {
        sessionId: 123,
        text: 'رد صحيح',
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('sessionId');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when text is not string', async () => {
      const invalidDto = {
        sessionId: 'session-123',
        text: 456,
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('text');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when metadata is not object', async () => {
      const invalidDto = {
        sessionId: 'session-123',
        text: 'رد صحيح',
        metadata: 'not-an-object',
      };

      const dto = plainToClass(BotReplyDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('metadata');
      expect(errors[0].constraints).toHaveProperty('isObject');
    });

    it('should validate with null metadata', async () => {
      const validDto = {
        sessionId: 'session-123',
        text: 'رد مع metadata null',
        metadata: null,
      };

      const dto = plainToClass(BotReplyDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate with undefined metadata', async () => {
      const validDto = {
        sessionId: 'session-123',
        text: 'رد مع metadata undefined',
        metadata: undefined,
      };

      const dto = plainToClass(BotReplyDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all properties', () => {
      const data = {
        sessionId: 'session-789',
        text: 'اختبار خصائص DTO',
        metadata: {
          source: 'manual_test',
          timestamp: Date.now(),
          complex: {
            nested: {
              value: 'test',
            },
          },
        },
      };

      const dto = plainToClass(BotReplyDto, data);

      expect(dto.sessionId).toBe(data.sessionId);
      expect(dto.text).toBe(data.text);
      expect(dto.metadata).toEqual(data.metadata);
    });

    it('should handle Arabic text correctly', () => {
      const arabicData = {
        sessionId: 'session-arabic',
        text: 'مرحباً بك في متجرنا الإلكتروني! نحن سعداء لخدمتك ومساعدتك في العثور على ما تبحث عنه',
        metadata: {
          language: 'ar',
          direction: 'rtl',
          encoding: 'utf-8',
        },
      };

      const dto = plainToClass(BotReplyDto, arabicData);

      expect(dto.sessionId).toBe(arabicData.sessionId);
      expect(dto.text).toBe(arabicData.text);
      expect(dto.text).toContain('مرحباً');
      expect(dto.text).toContain('متجرنا');
      expect(dto.metadata).toEqual(arabicData.metadata);
    });

    it('should handle special characters and emojis', () => {
      const specialData = {
        sessionId: 'session-special',
        text: 'مرحباً! 👋 كيف حالك؟ 😊 أريد شراء هذا المنتج 💰 بسعر $100',
        metadata: {
          hasEmojis: true,
          hasSpecialChars: true,
          symbols: ['👋', '😊', '💰', '$'],
        },
      };

      const dto = plainToClass(BotReplyDto, specialData);

      expect(dto.text).toContain('👋');
      expect(dto.text).toContain('😊');
      expect(dto.text).toContain('💰');
      expect(dto.text).toContain('$100');
      expect(dto.metadata?.hasEmojis).toBe(true);
    });

    it('should handle very long text', () => {
      const longText = 'هذا نص طويل جداً '.repeat(1000);
      const longData = {
        sessionId: 'session-long',
        text: longText,
        metadata: {
          length: longText.length,
          wordCount: longText.split(' ').length,
        },
      };

      const dto = plainToClass(BotReplyDto, longData);

      expect(dto.text).toBe(longText);
      expect(dto.text.length).toBeGreaterThan(10000);
      expect(dto.metadata?.length).toBe(longText.length);
    });

    it('should handle complex nested metadata', () => {
      const complexData = {
        sessionId: 'session-complex',
        text: 'رد مع metadata معقد',
        metadata: {
          ai: {
            model: 'gpt-4',
            temperature: 0.7,
            tokens: {
              input: 150,
              output: 75,
              total: 225,
            },
          },
          processing: {
            duration: 1250,
            steps: [
              'intent_analysis',
              'context_retrieval',
              'response_generation',
            ],
          },
          business: {
            merchantId: 'merchant-123',
            category: 'ecommerce',
            language: 'ar',
            features: {
              personalization: true,
              recommendations: true,
              analytics: false,
            },
          },
        },
      };

      const dto = plainToClass(BotReplyDto, complexData);

      expect(dto.metadata?.ai.model).toBe('gpt-4');
      expect(dto.metadata?.ai.tokens.total).toBe(225);
      expect(dto.metadata?.processing.steps).toHaveLength(3);
      expect(dto.metadata?.business.features.personalization).toBe(true);
    });

    it('should handle empty metadata object', () => {
      const emptyMetadataData = {
        sessionId: 'session-empty-meta',
        text: 'رد مع metadata فارغ',
        metadata: {},
      };

      const dto = plainToClass(BotReplyDto, emptyMetadataData);

      expect(dto.metadata).toEqual({});
      expect(Object.keys(dto.metadata || {})).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in sessionId', async () => {
      const data = {
        sessionId: '  session-123  ',
        text: 'رد مع مسافات في sessionId',
      };

      const dto = plainToClass(BotReplyDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sessionId).toBe('  session-123  ');
    });

    it('should handle whitespace in text', async () => {
      const data = {
        sessionId: 'session-123',
        text: '  رد مع مسافات في بداية ونهاية النص  ',
      };

      const dto = plainToClass(BotReplyDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.text).toBe('  رد مع مسافات في بداية ونهاية النص  ');
    });

    it('should handle only whitespace text as invalid', async () => {
      const data = {
        sessionId: 'session-123',
        text: '   \t\n   ',
      };

      const dto = plainToClass(BotReplyDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('text');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should handle special session ID formats', async () => {
      const specialSessionIds = [
        'session-123',
        'user@domain.com',
        '+966501234567',
        'session_with_underscores',
        'session-with-dashes',
        'Session.With.Dots',
        'SESSION_UPPERCASE',
      ];

      for (const sessionId of specialSessionIds) {
        const data = {
          sessionId,
          text: `رد للجلسة ${sessionId}`,
        };

        const dto = plainToClass(BotReplyDto, data);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.sessionId).toBe(sessionId);
      }
    });

    it('should handle array in metadata', () => {
      const data = {
        sessionId: 'session-array',
        text: 'رد مع array في metadata',
        metadata: {
          tags: ['helpful', 'accurate', 'fast'],
          history: [
            { timestamp: Date.now(), action: 'created' },
            { timestamp: Date.now() + 1000, action: 'processed' },
          ],
        },
      };

      const dto = plainToClass(BotReplyDto, data);

      expect(dto.metadata?.tags).toEqual(['helpful', 'accurate', 'fast']);
      expect(dto.metadata?.history).toHaveLength(2);
      const history = (dto.metadata as any)?.history as any[];
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('action');
    });

    it('should handle function in metadata (should be ignored/serialized)', () => {
      const data = {
        sessionId: 'session-function',
        text: 'رد مع function في metadata',
        metadata: {
          normalField: 'value',
          functionField: function () {
            return 'test';
          },
        },
      };

      const dto = plainToClass(BotReplyDto, data);

      expect(dto.metadata?.normalField).toBe('value');
      // Functions should be handled appropriately (likely ignored in serialization)
      expect(typeof dto.metadata?.functionField).toBe('function');
    });

    it('should handle circular reference in metadata', () => {
      const circularObj: any = {
        sessionId: 'session-circular',
        text: 'رد مع circular reference',
        metadata: {
          data: 'value',
        },
      };

      // Create circular reference
      circularObj.metadata.self = circularObj.metadata;

      const dto = plainToClass(BotReplyDto, circularObj);

      expect(dto.sessionId).toBe('session-circular');
      expect(dto.text).toBe('رد مع circular reference');
      expect(dto.metadata?.data).toBe('value');
      expect(dto.metadata?.self).toBe(dto.metadata);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types at compile time', () => {
      // This test ensures TypeScript type safety
      const dto = new BotReplyDto();

      // These should be type-safe assignments
      dto.sessionId = 'string-value';
      dto.text = 'string-value';
      dto.metadata = { key: 'value' };
      dto.metadata = undefined;

      expect(typeof dto.sessionId).toBe('string');
      expect(typeof dto.text).toBe('string');
    });

    it('should handle undefined values correctly', async () => {
      const data = {
        sessionId: 'session-undefined',
        text: 'رد مع قيم undefined',
        metadata: {
          defined: 'value',
          undefined: undefined,
          null: null,
        },
      };

      const dto = plainToClass(BotReplyDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.metadata?.defined).toBe('value');
      expect(dto.metadata?.undefined).toBeUndefined();
      expect(dto.metadata?.null).toBeNull();
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const originalData = {
        sessionId: 'session-serialize',
        text: 'رد للاختبار التسلسل',
        metadata: {
          timestamp: Date.now(),
          source: 'test',
          nested: {
            value: 'deep',
          },
        },
      };

      const dto = plainToClass(BotReplyDto, originalData);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);
      const newDto = plainToClass(BotReplyDto, deserialized);

      expect(newDto.sessionId).toBe(originalData.sessionId);
      expect(newDto.text).toBe(originalData.text);
      expect(newDto.metadata).toEqual(originalData.metadata);
    });

    it('should handle JSON serialization with special characters', () => {
      const data = {
        sessionId: 'session-json',
        text: 'نص مع "علامات اقتباس" و\'علامات مفردة\' و\\شرطة مائلة',
        metadata: {
          quotes: 'text with "quotes"',
          backslash: 'path\\to\\file',
          unicode: 'Unicode: \u0627\u0644\u0639\u0631\u0628\u064A\u0629',
        },
      };

      const dto = plainToClass(BotReplyDto, data);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.text).toContain('علامات اقتباس');
      expect(deserialized.metadata.quotes).toContain('"quotes"');
      expect(deserialized.metadata.unicode).toContain('العربية');
    });
  });
});
