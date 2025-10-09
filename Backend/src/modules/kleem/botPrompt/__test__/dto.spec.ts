import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateBotPromptDto } from '../dto/create-botPrompt.dto';
import { SandboxDto } from '../dto/sandbox.dto';
import { SetActiveKaleemDto } from '../dto/set-active.dto';
import { UpdateBotPromptDto } from '../dto/update-botPrompt.dto';

describe('BotPrompt DTOs', () => {
  describe('CreateBotPromptDto', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        name: 'البرومبت الأساسي',
        tags: ['افتراضي', 'دعم فني'],
        active: false,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require type field', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        content: 'أنت مساعد ذكي يساعد المستخدمين',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should validate type enum values', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'invalid_type',
        content: 'أنت مساعد ذكي يساعد المستخدمين',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'type')).toBe(true);
    });

    it('should require content field', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('content');
    });

    it('should validate minimum content length', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'short',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'content')).toBe(true);
    });

    it('should validate maximum content length', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'x'.repeat(10001), // Exceeds MAX_TEMPLATE_LENGTH_Kaleem
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'content')).toBe(true);
    });

    it('should validate name maximum length', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        name: 'x'.repeat(101), // Exceeds 100 characters
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should validate tags array constraints', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        tags: ['x'.repeat(31)], // Exceeds 30 characters per tag
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate maximum number of tags', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        tags: Array(11).fill('tag'), // Exceeds 10 tags
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate minimum number of tags', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        tags: [], // Less than 1 tag
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate active field as boolean', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        active: 'not_boolean',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'active')).toBe(true);
    });
  });

  describe('UpdateBotPromptDto', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(UpdateBotPromptDto, {
        content: 'محتوى محدث للبرومبت',
        name: 'البرومبت المحدث',
        active: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow partial updates', async () => {
      const dto = plainToInstance(UpdateBotPromptDto, {
        content: 'محتوى محدث فقط',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate content length constraints', async () => {
      const dto = plainToInstance(UpdateBotPromptDto, {
        content: 'short',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'content')).toBe(true);
    });

    it('should validate name length constraints', async () => {
      const dto = plainToInstance(UpdateBotPromptDto, {
        name: 'x'.repeat(101),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should validate active field type', async () => {
      const dto = plainToInstance(UpdateBotPromptDto, {
        active: 'not_boolean',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'active')).toBe(true);
    });

    it('should validate tags constraints', async () => {
      const dto = plainToInstance(UpdateBotPromptDto, {
        tags: ['x'.repeat(31)],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SandboxDto', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'مرحباً، كيف يمكنني الاشتراك في الخدمة؟',
        attachKnowledge: true,
        topK: 5,
        dryRun: false,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require text field', async () => {
      const dto = plainToInstance(SandboxDto, {
        attachKnowledge: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('text');
    });

    it('should validate text as non-empty string', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'text')).toBe(true);
    });

    it('should validate attachKnowledge as boolean', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'test message',
        attachKnowledge: 'not_boolean',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'attachKnowledge')).toBe(
        true,
      );
    });

    it('should validate topK as number within range', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'test message',
        topK: 25, // Exceeds maximum of 20
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'topK')).toBe(true);
    });

    it('should validate minimum topK value', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'test message',
        topK: 0, // Below minimum of 1
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'topK')).toBe(true);
    });

    it('should validate dryRun as boolean', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'test message',
        dryRun: 'not_boolean',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'dryRun')).toBe(true);
    });

    it('should use default values correctly', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'test message',
        // Using defaults for other fields
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      // Check that defaults are applied
      expect(dto.attachKnowledge).toBe(true);
      expect(dto.topK).toBe(5);
      expect(dto.dryRun).toBe(false);
    });
  });

  describe('SetActiveKaleemDto', () => {
    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(SetActiveKaleemDto, {
        active: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require active field', async () => {
      const dto = plainToInstance(SetActiveKaleemDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('active');
    });

    it('should validate active as boolean', async () => {
      const dto = plainToInstance(SetActiveKaleemDto, {
        active: 'not_boolean',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'active')).toBe(true);
    });

    it('should accept false value', async () => {
      const dto = plainToInstance(SetActiveKaleemDto, {
        active: false,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('DTO Transformation', () => {
    it('should transform string numbers to numbers for topK', async () => {
      const dto = plainToInstance(SandboxDto, {
        text: 'test message',
        topK: '5', // String number
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.topK).toBe(5); // Should be transformed to number
    });

    it('should handle null values for optional fields', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية',
        name: null,
        tags: null,
        active: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', async () => {
      const longContent =
        'أنت مساعد ذكي يساعد المستخدمين في استفساراتهم اليومية. '.repeat(1000);
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content: longContent,
      });

      const errors = await validate(dto);
      // Should fail due to length constraint but not crash
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle special characters in content', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content:
          'أنت مساعد ذكي! يمكنك مساعدتي في: \n1. السؤال الأول\n2. السؤال الثاني\n\nكيف يمكنني المتابعة؟',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode characters', async () => {
      const dto = plainToInstance(CreateBotPromptDto, {
        type: 'system',
        content:
          'أنت مساعد ذكي 🚀 يمكنك مساعدة المستخدمين في اللغة العربية والإنجليزية 🌟',
        name: 'برومبت متعدد اللغات 🌍',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
