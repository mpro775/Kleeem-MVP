import { renderPrompt } from '../common/template.service';

describe('Template Service', () => {
  describe('renderPrompt', () => {
    it('should replace single variable correctly', () => {
      const template = 'Hello {NAME}!';
      const vars = { NAME: 'أحمد' };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Hello أحمد!');
    });

    it('should replace multiple variables correctly', () => {
      const template =
        'Welcome {NAME} to {PLATFORM}. Your trial expires on {DATE}.';
      const vars = {
        NAME: 'سارة',
        PLATFORM: 'كليم',
        DATE: '2024-12-31',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe(
        'Welcome سارة to كليم. Your trial expires on 2024-12-31.',
      );
    });

    it('should handle Arabic text correctly', () => {
      const template = 'مرحباً {USER_NAME}، مرحباً بك في منصة {PLATFORM_NAME}';
      const vars = {
        USER_NAME: 'محمد',
        PLATFORM_NAME: 'كليم للذكاء الاصطناعي',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe(
        'مرحباً محمد، مرحباً بك في منصة كليم للذكاء الاصطناعي',
      );
    });

    it('should leave undefined variables unchanged', () => {
      const template =
        'Hello {NAME}! Welcome to {PLATFORM}. Your ID is {USER_ID}.';
      const vars = {
        NAME: 'علي',
        PLATFORM: 'كليم',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Hello علي! Welcome to كليم. Your ID is {USER_ID}.');
    });

    it('should handle empty template', () => {
      const template = '';
      const vars = { NAME: 'test' };

      const result = renderPrompt(template, vars);

      expect(result).toBe('');
    });

    it('should handle null template', () => {
      const template = null;
      const vars = { NAME: 'test' };

      const result = renderPrompt(template as any, vars);

      expect(result).toBe('');
    });

    it('should handle undefined template', () => {
      const template = undefined;
      const vars = { NAME: 'test' };

      const result = renderPrompt(template as any, vars);

      expect(result).toBe('');
    });

    it('should handle empty variables object', () => {
      const template = 'Hello {NAME}! Welcome to {PLATFORM}.';
      const vars = {};

      const result = renderPrompt(template, vars);

      expect(result).toBe('Hello {NAME}! Welcome to {PLATFORM}.');
    });

    it('should handle template without variables', () => {
      const template = 'This is a simple text without variables.';
      const vars = { NAME: 'test' };

      const result = renderPrompt(template, vars);

      expect(result).toBe('This is a simple text without variables.');
    });

    it('should handle duplicate variables', () => {
      const template = 'Hello {NAME}! How are you, {NAME}?';
      const vars = { NAME: 'فاطمة' };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Hello فاطمة! How are you, فاطمة?');
    });

    it('should handle variables with numbers', () => {
      const template = 'Launch date: {LAUNCH_DATE}, Version: {VERSION_1_0}';
      const vars = {
        LAUNCH_DATE: '2024-01-01',
        VERSION_1_0: '1.0.0',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Launch date: 2024-01-01, Version: 1.0.0');
    });

    it('should handle variables with underscores', () => {
      const template = 'User: {USER_NAME}, Email: {USER_EMAIL}, ID: {USER_ID}';
      const vars = {
        USER_NAME: 'خالد',
        USER_EMAIL: 'khalid@example.com',
        USER_ID: '12345',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('User: خالد, Email: khalid@example.com, ID: 12345');
    });

    it('should handle special characters in variables', () => {
      const template = 'URL: {APPLY_URL}, Email: {SUPPORT_EMAIL}';
      const vars = {
        APPLY_URL: 'https://apply.kaleem.ai?ref=test&utm=campaign',
        SUPPORT_EMAIL: 'support@kaleem.ai',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe(
        'URL: https://apply.kaleem.ai?ref=test&utm=campaign, Email: support@kaleem.ai',
      );
    });

    it('should handle newlines and complex formatting', () => {
      const template = `مرحباً {USER_NAME}!

هذه رسالة من منصة {PLATFORM_NAME}.
تاريخ الإطلاق: {LAUNCH_DATE}
رابط التسجيل: {APPLY_URL}

شكراً لك.`;

      const vars = {
        USER_NAME: 'نورا',
        PLATFORM_NAME: 'كليم',
        LAUNCH_DATE: '2024-01-01',
        APPLY_URL: 'https://apply.kaleem.ai',
      };

      const expectedResult = `مرحباً نورا!

هذه رسالة من منصة كليم.
تاريخ الإطلاق: 2024-01-01
رابط التسجيل: https://apply.kaleem.ai

شكراً لك.`;

      const result = renderPrompt(template, vars);

      expect(result).toBe(expectedResult);
    });

    it('should handle malformed variable patterns', () => {
      const template =
        'Hello {NAME, Welcome to {PLATFORM} and { INVALID } and {VALID}';
      const vars = {
        NAME: 'أحمد',
        PLATFORM: 'كليم',
        VALID: 'test',
      };

      const result = renderPrompt(template, vars);

      // Only valid patterns should be replaced
      expect(result).toBe(
        'Hello {NAME, Welcome to كليم and { INVALID } and test',
      );
    });

    it('should handle empty variable values', () => {
      const template = 'Name: {NAME}, Platform: {PLATFORM}, Empty: {EMPTY}';
      const vars = {
        NAME: 'سعد',
        PLATFORM: 'كليم',
        EMPTY: '',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Name: سعد, Platform: كليم, Empty: ');
    });

    it('should handle numeric variable values', () => {
      const template = 'Price: {PRICE}, Quantity: {QTY}, Total: {TOTAL}';
      const vars = {
        PRICE: '99.99',
        QTY: '5',
        TOTAL: '499.95',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Price: 99.99, Quantity: 5, Total: 499.95');
    });

    it('should handle case sensitivity correctly', () => {
      const template = 'Hello {NAME} and {name} and {Name}';
      const vars = {
        NAME: 'أحمد',
        name: 'محمد',
        Name: 'علي',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('Hello أحمد and {name} and {Name}');
    });

    it('should handle complex real-world template', () => {
      const template = `أهلاً وسهلاً بك في منصة كليم!

نحن متحمسون لإعلامك أن منصتنا ستكون متاحة في {LAUNCH_DATE}.

المميزات المتوفرة حالياً:
- {INTEGRATIONS_NOW}
- عرض تجريبي: {TRIAL_OFFER}

للتسجيل في قائمة الانتظار، يرجى زيارة: {APPLY_URL}

خططنا للتوسع:
- اليمن: {YEMEN_NEXT}
- موقعنا في السوق اليمني: {YEMEN_POSITIONING}

شكراً لاهتمامك بكليم!`;

      const vars = {
        LAUNCH_DATE: '1 يناير 2024',
        INTEGRATIONS_NOW: 'تكامل مع واتساب وتيليجرام',
        TRIAL_OFFER: '30 يوم مجاناً',
        APPLY_URL: 'https://apply.kaleem.ai',
        YEMEN_NEXT: 'نخطط لدخول السوق اليمني في النصف الثاني من 2024',
        YEMEN_POSITIONING:
          'منصة الذكاء الاصطناعي الرائدة للشركات الصغيرة والمتوسطة',
      };

      const result = renderPrompt(template, vars);

      expect(result).toContain('1 يناير 2024');
      expect(result).toContain('تكامل مع واتساب وتيليجرام');
      expect(result).toContain('30 يوم مجاناً');
      expect(result).toContain('https://apply.kaleem.ai');
      expect(result).toContain('نخطط لدخول السوق اليمني');
      expect(result).toContain('منصة الذكاء الاصطناعي الرائدة');
    });

    it('should handle performance with large templates', () => {
      // Create a large template with many variables
      const variables = Array.from({ length: 100 }, (_, i) => `VAR_${i}`);
      const template = variables.map((v) => `{${v}}`).join(' ');
      const vars = variables.reduce(
        (acc, v, i) => {
          acc[v] = `value_${i}`;
          return acc;
        },
        {} as Record<string, string>,
      );

      const startTime = Date.now();
      const result = renderPrompt(template, vars);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // Should replace all variables
      expect(result).toContain('value_0');
      expect(result).toContain('value_99');
      expect(result).not.toContain('{VAR_0}');
      expect(result).not.toContain('{VAR_99}');
    });

    it('should handle edge case with variable at start and end', () => {
      const template = '{START}middle content{END}';
      const vars = {
        START: 'بداية',
        END: 'نهاية',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('بدايةmiddle contentنهاية');
    });

    it('should handle consecutive variables', () => {
      const template = '{FIRST}{SECOND}{THIRD}';
      const vars = {
        FIRST: 'أول',
        SECOND: 'ثاني',
        THIRD: 'ثالث',
      };

      const result = renderPrompt(template, vars);

      expect(result).toBe('أولثانيثالث');
    });

    it('should match variable pattern correctly', () => {
      // Test the regex pattern used in the function
      const pattern = /\{([A-Z0-9_]+)\}/g;

      const validVariables = [
        '{NAME}',
        '{USER_ID}',
        '{LAUNCH_DATE}',
        '{VERSION_1_0}',
        '{API_KEY_123}',
      ];

      const invalidVariables = [
        '{name}', // lowercase
        '{user-id}', // hyphen
        '{launch date}', // space
        '{ NAME }', // spaces around
        '{NAME!}', // special character
      ];

      validVariables.forEach((variable) => {
        expect(variable).toMatch(pattern);
      });

      invalidVariables.forEach((variable) => {
        pattern.lastIndex = 0; // Reset regex
        expect(variable).not.toMatch(pattern);
      });
    });
  });
});
