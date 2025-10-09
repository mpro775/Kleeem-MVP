import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Define DTO classes for testing (copied from controller)
class SendKaleemMessageDto {
  text!: string;
  metadata?: Record<string, unknown>;
}

class RateMessageKaleemDto {
  msgIdx!: number;
  rating!: 0 | 1;
  feedback?: string;
}

describe('KleemChat DTOs', () => {
  describe('SendKaleemMessageDto', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً، كيف يمكنني الاشتراك في الخدمة؟',
        metadata: {
          platform: 'web',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date().toISOString(),
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require text field', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        metadata: { platform: 'web' },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('text');
    });

    it('should validate text as non-empty string', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'text')).toBe(true);
    });

    it('should validate text as string type', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 12345,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'text')).toBe(true);
    });

    it('should handle very long text', async () => {
      const longText = 'م'.repeat(10000);
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: longText,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Should not fail due to length
    });

    it('should validate metadata as object when provided', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: 'not_an_object',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'metadata')).toBe(true);
    });

    it('should handle null metadata', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle undefined metadata', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: undefined,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty metadata object', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: {},
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle complex metadata structures', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: {
          user: {
            id: 'user-123',
            profile: {
              name: 'أحمد محمد',
              preferences: {
                language: 'ar',
                notifications: {
                  email: true,
                  push: false,
                  sms: true,
                },
              },
            },
          },
          session: {
            id: 'session-456',
            startTime: new Date().toISOString(),
            device: {
              type: 'mobile',
              os: 'iOS',
              version: '15.6',
              screen: {
                width: 390,
                height: 844,
              },
            },
          },
          context: {
            page: '/chat',
            referrer: 'https://example.com/dashboard',
            utm: {
              source: 'google',
              medium: 'cpc',
              campaign: 'brand-awareness',
            },
          },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle special characters in text', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً! كيف حالك؟ 😊 أريد السؤال عن الخدمات 🚀 و الأسعار 💰',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode text correctly', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'أريد الاستفسار عن الخدمات المتاحة في المنصة الخاصة بكم',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle text with newlines and special formatting', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: `مرحباً

كيف يمكنني:
1. الاشتراك في الخدمة
2. معرفة الأسعار
3. الحصول على الدعم الفني

شكراً لك!`,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('RateMessageKaleemDto', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'كانت الإجابة مفيدة جداً وسريعة',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO without feedback', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 1,
        rating: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require msgIdx field', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        rating: 1,
        feedback: 'تعليق',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('msgIdx');
    });

    it('should require rating field', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        feedback: 'تعليق',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('rating');
    });

    it('should validate msgIdx as number', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 'not_a_number',
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'msgIdx')).toBe(true);
    });

    it('should validate rating enum values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 2, // Invalid value, should be 0 or 1
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'rating')).toBe(true);
    });

    it('should validate feedback maximum length', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'x'.repeat(501), // Exceeds 500 character limit
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'feedback')).toBe(true);
    });

    it('should handle zero msgIdx', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 0,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle large msgIdx values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: Number.MAX_SAFE_INTEGER,
        rating: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle negative msgIdx values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: -1,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'msgIdx')).toBe(true);
    });

    it('should handle decimal msgIdx values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2.5,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Should be valid as number
    });

    it('should handle feedback at maximum length', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'x'.repeat(500), // Exactly at the limit
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle feedback just over maximum length', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'x'.repeat(501), // Just over the limit
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'feedback')).toBe(true);
    });

    it('should handle empty feedback string', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: '',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle feedback with unicode characters', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'كانت الإجابة ممتازة جداً! شكراً لك 😊👍',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle feedback with newlines', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: `كانت الإجابة مفيدة
لكن أتمنى لو كانت أكثر تفصيلاً
عموماً ممتازة`,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('DTO Transformation', () => {
    it('should transform string numbers for msgIdx', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: '2', // String number
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.msgIdx).toBe(2); // Should be transformed to number
    });

    it('should transform string numbers for rating', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: '1', // String number
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.rating).toBe(1); // Should be transformed to number
    });

    it('should handle null values for optional fields', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle undefined values for optional fields', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: undefined,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely large metadata objects', async () => {
      const largeMetadata = {};

      // Create very large metadata object
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`.repeat(100);
      }

      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: largeMetadata,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle metadata with circular references', async () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: circular,
      });

      // Should not crash even with circular references
      const errors = await validate(dto);
      // The validation might fail due to circular reference, but shouldn't crash
      expect(typeof errors).toBe('object');
    });

    it('should handle special characters in feedback', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'ممتاز! 👍🚀😊 خاصة في الشرح الواضح والمفصل 💯',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle binary-like content in text', async () => {
      // Simulate content that might look like binary data
      const binaryLikeText = Buffer.from('test message').toString('base64');
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: binaryLikeText,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle very small msgIdx values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: Number.MIN_SAFE_INTEGER,
        rating: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'msgIdx')).toBe(true);
    });

    it('should handle floating point msgIdx', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2.7,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Should be valid as number
    });

    it('should handle NaN values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: NaN,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'msgIdx')).toBe(true);
    });

    it('should handle Infinity values', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: Infinity,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'msgIdx')).toBe(true);
    });
  });

  describe('Validation Constraints', () => {
    it('should enforce minimum constraints', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: -1,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'msgIdx')).toBe(true);
    });

    it('should enforce enum constraints for rating', async () => {
      const invalidRatings = [-1, 2, 3, 0.5, '1'];

      for (const rating of invalidRatings) {
        const dto = plainToInstance(RateMessageKaleemDto, {
          msgIdx: 2,
          rating: rating as any,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'rating')).toBe(true);
      }
    });

    it('should enforce string type for text', async () => {
      const invalidTextTypes = [123, true, {}, [], null];

      for (const textValue of invalidTextTypes) {
        const dto = plainToInstance(SendKaleemMessageDto, {
          text: textValue,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'text')).toBe(true);
      }
    });

    it('should enforce string type for feedback', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 12345,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'feedback')).toBe(true);
    });

    it('should enforce object type for metadata', async () => {
      const invalidMetadataTypes = ['string', 123, true, [], null];

      for (const metadataValue of invalidMetadataTypes) {
        const dto = plainToInstance(SendKaleemMessageDto, {
          text: 'مرحباً',
          metadata: metadataValue,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.property === 'metadata')).toBe(
          true,
        );
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical chat message', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً، أريد معرفة المزيد عن خدماتكم في مجال الذكاء الاصطناعي',
        metadata: {
          source: 'website',
          page: '/services/ai',
          timestamp: new Date().toISOString(),
          userId: 'user-123',
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle typical rating submission', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 3,
        rating: 1,
        feedback: 'كانت الإجابة سريعة ومفيدة، ساعدتني في حل مشكلتي بسرعة',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle minimal valid message', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle minimal valid rating', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 0,
        rating: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Error message validation', () => {
    it('should provide meaningful error messages for text validation', async () => {
      const dto = plainToInstance(SendKaleemMessageDto, {
        text: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const textError = errors.find((error) => error.property === 'text');
      expect(textError).toBeDefined();
      expect(textError?.constraints).toBeDefined();
    });

    it('should provide meaningful error messages for rating validation', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 5,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const ratingError = errors.find((error) => error.property === 'rating');
      expect(ratingError).toBeDefined();
      expect(ratingError?.constraints).toBeDefined();
    });

    it('should provide meaningful error messages for msgIdx validation', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: -1,
        rating: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const msgIdxError = errors.find((error) => error.property === 'msgIdx');
      expect(msgIdxError).toBeDefined();
      expect(msgIdxError?.constraints).toBeDefined();
    });

    it('should provide meaningful error messages for feedback length', async () => {
      const dto = plainToInstance(RateMessageKaleemDto, {
        msgIdx: 2,
        rating: 1,
        feedback: 'x'.repeat(501),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const feedbackError = errors.find(
        (error) => error.property === 'feedback',
      );
      expect(feedbackError).toBeDefined();
      expect(feedbackError?.constraints).toBeDefined();
    });
  });

  describe('Performance tests', () => {
    it('should handle validation of large DTOs efficiently', async () => {
      const largeMetadata: Record<string, string> = {};

      // Create large metadata object
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`.repeat(50);
      }

      const dto = plainToInstance(SendKaleemMessageDto, {
        text: 'مرحباً',
        metadata: largeMetadata,
      });

      const startTime = Date.now();
      const errors = await validate(dto);
      const endTime = Date.now();

      expect(errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple validations efficiently', async () => {
      const dtos: SendKaleemMessageDto[] = [];

      // Create multiple DTOs for batch validation
      for (let i = 0; i < 100; i++) {
        dtos.push(
          plainToInstance(SendKaleemMessageDto, {
            text: `مرحباً ${i}`,
            metadata: { index: i },
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
});
