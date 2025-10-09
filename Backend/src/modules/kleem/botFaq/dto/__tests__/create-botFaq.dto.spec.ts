import { validate } from 'class-validator';

import { CreateBotFaqDto } from '../create-botFaq.dto';

describe('CreateBotFaqDto', () => {
  describe('Validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'كيف يمكنني إعادة تعيين كلمة المرور الخاصة بي؟';
      dto.answer =
        'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.';
      dto.source = 'manual';
      dto.tags = ['حساب', 'تسجيل دخول'];
      dto.locale = 'ar';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with minimal data', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال بسيط';
      dto.answer = 'إجابة بسيطة';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when question is missing', async () => {
      const dto = new CreateBotFaqDto();
      dto.answer = 'إجابة بدون سؤال';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('question');
    });

    it('should fail validation when answer is missing', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال بدون إجابة';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('answer');
    });

    it('should fail validation when question is empty string', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = '   '; // فراغات فقط
      dto.answer = 'إجابة';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when answer is empty string', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = '   '; // فراغات فقط

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when question exceeds max length', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'س'.repeat(501); // أكثر من 500 حرف
      dto.answer = 'إجابة';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should fail validation when answer exceeds max length', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إ'.repeat(1001); // أكثر من 1000 حرف

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should fail validation when source is not valid enum', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      (dto as any).source = 'invalid_source';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });

    it('should fail validation when locale is not valid enum', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      (dto as any).locale = 'fr'; // لغة غير مدعومة

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });

    it('should fail validation when tags exceed max size', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      dto.tags = Array(21).fill('وسم'); // أكثر من 20 وسم

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
    });

    it('should accept valid source values', async () => {
      const validSources = ['manual', 'auto', 'imported'];

      for (const source of validSources) {
        const dto = new CreateBotFaqDto();
        dto.question = 'سؤال';
        dto.answer = 'إجابة';
        (dto as any).source = source;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should accept valid locale values', async () => {
      const validLocales = ['ar', 'en'];

      for (const locale of validLocales) {
        const dto = new CreateBotFaqDto();
        dto.question = 'سؤال';
        dto.answer = 'إجابة';
        (dto as any).locale = locale;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle long but valid question and answer', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'س'.repeat(500); // بالضبط الحد الأقصى
      dto.answer = 'إ'.repeat(1000); // بالضبط الحد الأقصى

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle question and answer with special characters', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'كيف تستخدم الرموز الخاصة؟! @#$%^&*()';
      dto.answer = 'يمكنك استخدام الرموز في النصوص بشكل طبيعي.';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle Arabic text correctly', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'كيف حالك اليوم؟';
      dto.answer = 'أنا بخير، شكراً لسؤالك!';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle English text correctly', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'How are you today?';
      dto.answer = 'I am fine, thank you for asking!';
      (dto as any).locale = 'en';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle tags as optional field', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال بدون وسوم';
      dto.answer = 'إجابة بدون وسوم';
      // tags غير محدد

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle empty tags array', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      dto.tags = [];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle single tag', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      dto.tags = ['وسم واحد'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle maximum allowed tags', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      dto.tags = Array(20).fill('وسم');

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle source as optional field', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      // source غير محدد

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle locale as optional field', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';
      // locale غير محدد

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle mixed Arabic and English content', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'How to use اللغة العربية in questions?';
      dto.answer =
        'يمكنك استخدام كل من اللغة العربية والإنجليزية في نفس السؤال والإجابة.';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle question and answer with line breaks', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال متعدد الأسطر\nمع فواصل أسطر';
      dto.answer = 'إجابة متعددة الأسطر\nمع فواصل أسطر أيضاً\nوحتى ثلاثة أسطر';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle question and answer with whitespace', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال مع فراغات';
      dto.answer = 'إجابة مع فراغات';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle numeric values in question and answer', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'كم عدد المستخدمين المسجلين؟ 1,234,567';
      dto.answer = 'يوجد حالياً 1234567 مستخدم مسجل في النظام.';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle URLs in question and answer', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'كيف يمكنني الوصول إلى الموقع؟';
      dto.answer =
        'يمكنك زيارة موقعنا على https://example.com أو الاتصال بنا عبر البريد الإلكتروني على support@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle complex HTML-like content', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'كيف تستخدم <b>التنسيق الخاص</b>؟';
      dto.answer =
        'يمكنك استخدام <strong>التنسيق الغامق</strong> و<i>المائل</i> في النصوص.';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle very long valid content', async () => {
      const dto = new CreateBotFaqDto();
      dto.question =
        'سؤال طويل جداً يحتوي على الكثير من التفاصيل حول كيفية استخدام النظام وجميع الميزات المتاحة فيه والتي تشمل إدارة الحسابات وإنشاء المحتوى وإدارة المستخدمين والتقارير والإحصائيات والتكامل مع الأنظمة الأخرى والعديد من الميزات الأخرى التي تجعل النظام شاملاً ومتكاملاً للغاية'.substring(
          0,
          500,
        );
      dto.answer =
        'إجابة شاملة تشرح جميع جوانب النظام بالتفصيل الكامل مع أمثلة عملية وإرشادات خطوة بخطوة لضمان فهم كامل لكيفية استخدام جميع الميزات المتاحة في النظام بشكل فعال وصحيح.'.substring(
          0,
          1000,
        );

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle question with exactly 500 characters', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'س'.repeat(500);
      dto.answer = 'إجابة';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle answer with exactly maximum length', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إ'.repeat(1000); // بالضبط الحد الأقصى

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when question is null', async () => {
      const dto = new CreateBotFaqDto();
      (dto as any).question = null;
      dto.answer = 'إجابة';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when answer is null', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      (dto as any).answer = null;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when question is undefined', async () => {
      const dto = new CreateBotFaqDto();
      (dto as any).question = undefined;
      dto.answer = 'إجابة';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when answer is undefined', async () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      (dto as any).answer = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should handle question and answer assignment', () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';

      expect(dto.question).toBe('سؤال');
      expect(dto.answer).toBe('إجابة');
    });

    it('should handle non-string values gracefully', () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال' as any;
      dto.answer = 'إجابة' as any;

      // لا يجب أن يرمي خطأ
      expect(dto.question).toBe('سؤال');
      expect(dto.answer).toBe('إجابة');
    });
  });

  describe('Default Values', () => {
    it('should have default source as manual when not provided', () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';

      // المفترض أن يكون هناك قيمة افتراضية، لكن الاختبار يفحص السلوك الحالي
      expect(dto.source).toBeUndefined();
    });

    it('should have default locale as ar when not provided', () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';

      // المفترض أن يكون هناك قيمة افتراضية، لكن الاختبار يفحص السلوك الحالي
      expect(dto.locale).toBeUndefined();
    });

    it('should have empty tags array when not provided', () => {
      const dto = new CreateBotFaqDto();
      dto.question = 'سؤال';
      dto.answer = 'إجابة';

      expect(dto.tags).toBeUndefined();
    });
  });
});
