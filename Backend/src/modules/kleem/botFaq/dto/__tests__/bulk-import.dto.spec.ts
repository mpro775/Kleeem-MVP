import { validate } from 'class-validator';

import { BulkImportDto } from '../bulk-import.dto';

describe('BulkImportDto', () => {
  describe('Validation', () => {
    it('should pass validation with valid single item', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
          answer:
            'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with multiple valid items', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال الأول',
          answer: 'إجابة الأولى',
          source: 'manual',
          tags: ['عام'],
          locale: 'ar',
        },
        {
          question: 'Second question',
          answer: 'Second answer',
          source: 'auto',
          tags: ['general'],
          locale: 'en',
        },
        {
          question: 'سؤال ثالث',
          answer: 'إجابة ثالثة',
          source: 'imported',
          tags: ['متنوع'],
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when items array is missing', async () => {
      const dto = new BulkImportDto();
      // items غير محدد

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('items');
    });

    it('should fail validation when items array is empty', async () => {
      const dto = new BulkImportDto();
      dto.items = [];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.arrayMinSize).toBeDefined();
    });

    it('should fail validation when items exceed maximum size', async () => {
      const dto = new BulkImportDto();
      dto.items = Array(501).fill({
        question: 'سؤال',
        answer: 'إجابة',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
    });

    it('should fail validation when items array is not array', async () => {
      const dto = new BulkImportDto();
      (dto as any).items = 'not an array';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isArray).toBeDefined();
    });

    it('should fail validation when item in array is invalid', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال صالح',
          answer: 'إجابة صالحة',
        },
        {
          // سؤال مفقود
          answer: 'إجابة بدون سؤال',
        } as any,
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      // يجب أن يظهر خطأ في العنصر الثاني في المصفوفة
      expect(errors.some((error) => error.property === 'items')).toBe(true);
    });

    it('should fail validation when item has invalid source', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: 'إجابة',
          source: 'invalid_source' as any,
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item has invalid locale', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'Question',
          answer: 'Answer',
          locale: 'fr' as any,
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item has too many tags', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: 'إجابة',
          tags: Array(21).fill('وسم'),
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item has empty question', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: '',
          answer: 'إجابة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item has empty answer', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: '',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item question exceeds max length', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'س'.repeat(501),
          answer: 'إجابة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item answer exceeds max length', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: 'إ'.repeat(1001),
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass validation with exactly 500 items (maximum allowed)', async () => {
      const dto = new BulkImportDto();
      dto.items = Array(500).fill({
        question: 'سؤال قصير',
        answer: 'إجابة قصيرة',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with exactly 1 item (minimum allowed)', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال واحد فقط',
          answer: 'إجابة واحدة فقط',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle mixed Arabic and English content in items', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'How to use اللغة العربية in questions?',
          answer:
            'يمكنك استخدام كل من اللغة العربية والإنجليزية في نفس السؤال والإجابة.',
        },
        {
          question: 'سؤال باللغة العربية فقط',
          answer: 'إجابة باللغة العربية فقط',
          locale: 'ar',
        },
        {
          question: 'Question in English only',
          answer: 'Answer in English only',
          locale: 'en',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with special characters and symbols', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف تستخدم الرموز الخاصة؟! @#$%^&*()',
          answer: 'يمكنك استخدام الرموز في النصوص بشكل طبيعي.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with URLs and email addresses', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف يمكنني الوصول إلى الموقع؟',
          answer:
            'يمكنك زيارة موقعنا على https://example.com أو الاتصال بنا عبر البريد الإلكتروني على support@example.com',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with line breaks and multiline content', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال متعدد الأسطر\nمع فواصل أسطر',
          answer: 'إجابة متعددة الأسطر\nمع فواصل أسطر أيضاً\nوحتى ثلاثة أسطر',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with numeric values', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كم عدد المستخدمين المسجلين؟ 1,234,567',
          answer: 'يوجد حالياً 1234567 مستخدم مسجل في النظام.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with all optional fields provided', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال كامل',
          answer: 'إجابة كاملة',
          source: 'manual',
          tags: ['عام', 'شائع'],
          locale: 'ar',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with minimal data (only required fields)', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال بسيط',
          answer: 'إجابة بسيطة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with empty tags array', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال بدون وسوم',
          answer: 'إجابة بدون وسوم',
          tags: [],
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with maximum allowed tags', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال مع أقصى عدد من الوسوم',
          answer: 'إجابة مع أقصى عدد من الوسوم',
          tags: Array(20).fill('وسم'),
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with all valid source values', async () => {
      const validSources = ['manual', 'auto', 'imported'];
      const dto = new BulkImportDto();
      dto.items = validSources.map((source, index) => ({
        question: `سؤال ${index + 1}`,
        answer: `إجابة ${index + 1}`,
        source,
      })) as any;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with all valid locale values', async () => {
      const validLocales = ['ar', 'en'];
      const dto = new BulkImportDto();
      dto.items = validLocales.map((locale, index) => ({
        question: `Question ${index + 1}`,
        answer: `Answer ${index + 1}`,
        locale,
      })) as any;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when item is null', async () => {
      const dto = new BulkImportDto();
      dto.items = [null as any];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item is undefined', async () => {
      const dto = new BulkImportDto();
      dto.items = [undefined as any];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item is not an object', async () => {
      const dto = new BulkImportDto();
      dto.items = ['string instead of object' as any];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when item is missing both question and answer', async () => {
      const dto = new BulkImportDto();
      dto.items = [{} as any];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle very large valid content in items', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question:
            'سؤال طويل جداً يحتوي على الكثير من التفاصيل حول كيفية استخدام النظام وجميع الميزات المتاحة فيه والتي تشمل إدارة الحسابات وإنشاء المحتوى وإدارة المستخدمين والتقارير والإحصائيات والتكامل مع الأنظمة الأخرى والعديد من الميزات الأخرى التي تجعل النظام شاملاً ومتكاملاً للغاية'.substring(
              0,
              500,
            ),
          answer:
            'إجابة شاملة تشرح جميع جوانب النظام بالتفصيل الكامل مع أمثلة عملية وإرشادات خطوة بخطوة لضمان فهم كامل لكيفية استخدام جميع الميزات المتاحة في النظام بشكل فعال وصحيح.'.substring(
              0,
              1000,
            ),
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with HTML-like content', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف تستخدم <b>التنسيق الخاص</b>؟',
          answer:
            'يمكنك استخدام <strong>التنسيق الغامق</strong> و<i>المائل</i> في النصوص.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with exactly maximum length question', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'س'.repeat(500),
          answer: 'إجابة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with exactly maximum length answer', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: 'إ'.repeat(1000),
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle multiple items with different configurations', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        // عنصر باللغة العربية مع جميع الحقول
        {
          question: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
          answer:
            'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
          source: 'manual',
          tags: ['حساب', 'تسجيل دخول', 'كلمة مرور'],
          locale: 'ar',
        },
        // عنصر باللغة الإنجليزية
        {
          question: 'How can I reset my password?',
          answer:
            'You can reset your password by clicking on "Forgot Password" on the login page.',
          source: 'manual',
          tags: ['account', 'login', 'password'],
          locale: 'en',
        },
        // عنصر بسيط بدون حقول اختيارية
        {
          question: 'سؤال بسيط',
          answer: 'إجابة بسيطة',
        },
        // عنصر مع بعض الحقول فقط
        {
          question: 'سؤال متوسط',
          answer: 'إجابة متوسطة',
          source: 'auto',
          locale: 'ar',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with complex Arabic text and diacritics', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question:
            'كَيْفَ يُمْكِنُنِي إِعَادَةُ تَعْيِينِ كَلِمَةِ الْمُرُورِ الْخَاصَّةِ بِي؟',
          answer:
            'يُمْكِنُكَ إِعَادَةُ تَعْيِينِ كَلِمَةِ الْمُرُورِ مِنْ خِلَالِ النَّقْرِ عَلَى "نَسِيتَ كَلِمَةَ الْمُرُورِ" فِي صَفْحَةِ تَسْجِيلِ الدَّخُولِ.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with technical terms and code-like content', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أستخدم API_KEY في التطبيق؟',
          answer:
            'يمكنك استخدام API_KEY في رأس الطلبات (headers) كالتالي: Authorization: Bearer YOUR_API_KEY',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with mathematical and scientific content', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'ما هي صيغة حساب المساحة؟',
          answer:
            'مساحة المستطيل = الطول × العرض، مساحة الدائرة = π × النصف القطر²',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with business and financial terms', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أحسب الضريبة على المبيعات؟',
          answer:
            'الضريبة = سعر المنتج × نسبة الضريبة (15%)، السعر الإجمالي = سعر المنتج + الضريبة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with dates and time formats', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'متى يبدأ العمل الرسمي؟',
          answer:
            'العمل الرسمي يبدأ من الساعة 8:00 صباحاً حتى 5:00 مساءً، من الأحد إلى الخميس.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with contact information', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أتواصل مع الدعم الفني؟',
          answer:
            'يمكنك التواصل معنا عبر:\nالهاتف: +966 11 234 5678\nالبريد الإلكتروني: support@company.com\nأو زيارة موقعنا: www.company.com/support',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with step-by-step instructions', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أقوم بتسجيل حساب جديد؟',
          answer:
            'للتسجيل في النظام، اتبع الخطوات التالية:\n1. اضغط على "إنشاء حساب جديد"\n2. أدخل بياناتك الشخصية\n3. قم بتأكيد البريد الإلكتروني\n4. أكمل إعداد الحساب',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when items array is null', async () => {
      const dto = new BulkImportDto();
      (dto as any).items = null;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when items array is undefined', async () => {
      const dto = new BulkImportDto();
      (dto as any).items = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when items array contains mixed valid and invalid items', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال صالح',
          answer: 'إجابة صالحة',
        },
        {
          question: '', // سؤال فارغ
          answer: 'إجابة',
        },
        {
          question: 'سؤال آخر صالح',
          answer: 'إجابة أخرى صالحة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle items with very long but valid content', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question:
            'سؤال طويل جداً يحتوي على الكثير من التفاصيل حول كيفية استخدام النظام وجميع الميزات المتاحة فيه والتي تشمل إدارة الحسابات وإنشاء المحتوى وإدارة المستخدمين والتقارير والإحصائيات والتكامل مع الأنظمة الأخرى والعديد من الميزات الأخرى التي تجعل النظام شاملاً ومتكاملاً للغاية ويوفر حلولاً متكاملة لجميع احتياجات الأعمال الحديثة في عصر التكنولوجيا الرقمية'.substring(
              0,
              500,
            ),
          answer:
            'إجابة شاملة ومفصلة تشرح جميع جوانب النظام بالتفصيل الكامل مع أمثلة عملية وإرشادات خطوة بخطوة لضمان فهم كامل لكيفية استخدام جميع الميزات المتاحة في النظام بشكل فعال وصحيح وتحقيق أقصى استفادة من الإمكانيات المتوفرة في هذا النظام المتطور والمتكامل'.substring(
              0,
              1000,
            ),
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Nested Validation', () => {
    it('should validate each item in the array as CreateBotFaqDto', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال صالح',
          answer: 'إجابة صالحة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should provide detailed validation errors for invalid items', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: '', // سؤال فارغ
          answer: 'إجابة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // يجب أن يحتوي على خطأ متعلق بالسؤال الفارغ في العنصر الأول
      const itemErrors = errors.filter((error) => error.property === 'items');
      expect(itemErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with only whitespace in question and answer', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: '   ',
          answer: '   ',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle items with extremely long tags', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: 'إجابة',
          tags: ['وسم طويل جداً'.repeat(10)], // وسم طويل جداً
        },
      ];

      const errors = await validate(dto);
      // يجب أن يفشل بسبب طول الوسم وليس بسبب عدد الوسوم
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle items with special Unicode characters', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف تستخدم الحروف الخاصة؟ ∑∆∂ƒ©®™',
          answer:
            'يمكنك استخدام جميع الحروف والرموز الخاصة في النظام بدون مشاكل.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with mixed content types', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال عربي مع أرقام 123 و رموز @#$%',
          answer: 'إجابة عربية مع أرقام 456 و رموز &*()_+',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with quoted text and citations', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'ما هي السياسة المذكورة في "دليل المستخدم"؟',
          answer:
            'تقول السياسة في الصفحة 15 من دليل المستخدم: "يجب على جميع المستخدمين الالتزام بقواعد الاستخدام الأخلاقي للنظام".',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with bullet points and lists', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'ما هي الميزات المتاحة؟',
          answer:
            'الميزات المتاحة تشمل:\n• إدارة الحسابات\n• إنشاء المحتوى\n• التقارير والإحصائيات\n• التكامل مع الأنظمة الأخرى',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with code snippets and technical syntax', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أستخدم دالة calculateTotal؟',
          answer:
            'لاستخدام دالة calculateTotal، اتبع هذا المثال:\n\nfunction calculateTotal(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with multiple paragraphs', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أبدأ في استخدام النظام؟',
          answer:
            'لبدء استخدام النظام، اتبع الخطوات التالية:\n\nالفقرة الأولى: قم بإنشاء حساب جديد وتأكيد البريد الإلكتروني.\n\nالفقرة الثانية: قم بتسجيل الدخول وقم بإعداد ملفك الشخصي بالمعلومات المطلوبة.\n\nالفقرة الثالثة: ابدأ في استخدام الميزات المتاحة حسب احتياجاتك.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with table-like content using markdown', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'ما هي أسعار الباقات المختلفة؟',
          answer:
            'إليك جدول بأسعار الباقات المختلفة:\n\n| الباقة | السعر | الميزات |\n|---------|-------|----------|\n| أساسية | 99 ريال | ميزات محدودة |\n| متقدمة | 199 ريال | جميع الميزات |\n| مؤسسية | 499 ريال | ميزات متقدمة + دعم فني |',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with emoji and emoticons', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف يمكنني التعبير عن المشاعر؟ 😊',
          answer:
            'يمكنك استخدام الرموز التعبيرية في جميع أجزاء النظام! 👍 مرحباً بك في عالم التعبيرات الرقمية 🚀',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with right-to-left text direction', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'كيف أكتب من اليمين إلى اليسار؟',
          answer:
            'اللغة العربية مكتوبة من اليمين إلى اليسار بشكل طبيعي في النظام.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with very short but valid content', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال قصير؟',
          answer: 'إجابة قصيرة.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with repeated content patterns', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال مكرر مكرر مكرر مكرر مكرر',
          answer: 'إجابة مكررة مكررة مكررة مكررة مكررة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle items with nested quotes and brackets', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question:
            'كيف أستخدم "الاقتباسات" والأقواس (والأقواس المربعة [والأقواس المتعرجة])؟',
          answer:
            'يمكنك استخدام جميع أنواع علامات الاقتباس والأقواس في النصوص بدون مشاكل.',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Type Transformation', () => {
    it('should validate items array as array of CreateBotFaqDto objects', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: 'سؤال',
          answer: 'إجابة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle transformation of nested DTO properties', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: '  سؤال مع فراغات  ',
          answer: '  إجابة مع فراغات  ',
          source: 'manual',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);

      // التحقق من أن التحويل تم بشكل صحيح
      expect(dto.items[0].question).toBe('سؤال مع فراغات');
      expect(dto.items[0].answer).toBe('إجابة مع فراغات');
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message for empty array', async () => {
      const dto = new BulkImportDto();
      dto.items = [];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const arrayMinSizeError = errors.find(
        (error) => error.constraints?.arrayMinSize,
      );
      expect(arrayMinSizeError).toBeDefined();
    });

    it('should provide clear error message for exceeding max size', async () => {
      const dto = new BulkImportDto();
      dto.items = Array(501).fill({
        question: 'سؤال',
        answer: 'إجابة',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const arrayMaxSizeError = errors.find(
        (error) => error.constraints?.arrayMaxSize,
      );
      expect(arrayMaxSizeError).toBeDefined();
    });

    it('should provide detailed nested validation errors', async () => {
      const dto = new BulkImportDto();
      dto.items = [
        {
          question: '', // خطأ في العنصر الأول
          answer: 'إجابة',
        },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // يجب أن يحتوي على خطأ متعلق بالسؤال الفارغ
      const itemError = errors.find((error) => error.property === 'items');
      expect(itemError).toBeDefined();
    });
  });
});
