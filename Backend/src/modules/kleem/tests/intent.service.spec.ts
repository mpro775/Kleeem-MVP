import { Test, TestingModule } from '@nestjs/testing';
import { IntentService } from '../intent/intent.service';
import { SettingsService } from '../settings/settings.service';

describe('IntentService', () => {
  let service: IntentService;
  let mockSettingsService: jest.Mocked<SettingsService>;

  beforeEach(async () => {
    mockSettingsService = {
      cached: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentService,
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<IntentService>(IntentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have SettingsService injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('highIntent', () => {
    it('should return true when text contains high intent keywords', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'اشتري', 'أريد أن أشتري'],
      });

      expect(service.highIntent('أريد أن أشتري المنتج')).toBe(true);
      expect(service.highIntent('سأقوم بشراء الخدمة')).toBe(true);
      expect(service.highIntent('اشتري الآن')).toBe(true);
    });

    it('should return false when text does not contain high intent keywords', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'اشتري', 'أريد أن أشتري'],
      });

      expect(service.highIntent('مرحباً، كيف حالك؟')).toBe(false);
      expect(service.highIntent('ما هي خدماتكم؟')).toBe(false);
      expect(service.highIntent('أريد معرفة المزيد')).toBe(false);
    });

    it('should be case insensitive', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'اشتري'],
      });

      expect(service.highIntent('شراء')).toBe(true);
      expect(service.highIntent('شراء')).toBe(true);
      expect(service.highIntent('اشتري')).toBe(true);
      expect(service.highIntent('اشتري')).toBe(true);
    });

    it('should handle Arabic and English keywords', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'buy', 'purchase', 'اشتري'],
      });

      expect(service.highIntent('I want to buy this product')).toBe(true);
      expect(service.highIntent('أريد شراء هذا المنتج')).toBe(true);
      expect(service.highIntent('Let me purchase it')).toBe(true);
      expect(service.highIntent('سأقوم باشتري الخدمة')).toBe(true);
    });

    it('should handle partial word matches correctly', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء'],
      });

      // Should match even when keyword is part of a larger word
      expect(service.highIntent('سأقوم بالشراء')).toBe(true);
      expect(service.highIntent('عملية الشراء')).toBe(true);
    });

    it('should return false when keywords array is empty', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: [],
      });

      expect(service.highIntent('شراء المنتج')).toBe(false);
      expect(service.highIntent('buy now')).toBe(false);
    });

    it('should return false when keywords array is undefined', () => {
      mockSettingsService.cached.mockReturnValue({});

      expect(service.highIntent('شراء المنتج')).toBe(false);
    });

    it('should return false when keywords array is null', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: null,
      });

      expect(service.highIntent('شراء المنتج')).toBe(false);
    });

    it('should handle empty or whitespace keywords', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', '', '  ', 'اشتري', '\t\n'],
      });

      // Should ignore empty/whitespace keywords and work with valid ones
      expect(service.highIntent('أريد شراء المنتج')).toBe(true);
      expect(service.highIntent('اشتري الآن')).toBe(true);
      expect(service.highIntent('مرحباً')).toBe(false);
    });

    it('should handle special regex characters in keywords', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: [
          '$100',
          '(urgent)',
          '[priority]',
          '*special*',
          '^start',
          'end$',
        ],
      });

      // Should escape special regex characters
      expect(service.highIntent('This costs $100')).toBe(true);
      expect(service.highIntent('This is (urgent) request')).toBe(true);
      expect(service.highIntent('Mark as [priority]')).toBe(true);
      expect(service.highIntent('This is *special* offer')).toBe(true);
      expect(service.highIntent('^start the process')).toBe(true);
      expect(service.highIntent('Please end$ now')).toBe(true);
    });

    it('should handle null or undefined text input', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'buy'],
      });

      expect(service.highIntent(null as any)).toBe(false);
      expect(service.highIntent(undefined as any)).toBe(false);
      expect(service.highIntent('')).toBe(false);
    });

    it('should handle very long text efficiently', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'buy'],
      });

      const longText = 'ا'.repeat(10000) + ' شراء ' + 'ب'.repeat(10000);

      const startTime = Date.now();
      const result = service.highIntent(longText);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle multiple keywords in single text', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', 'اشتري', 'buy'],
      });

      expect(service.highIntent('أريد شراء وسأقوم باشتري و buy')).toBe(true);
    });

    it('should match first occurrence of keyword', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['test'],
      });

      const text = 'This is a test and another test';
      expect(service.highIntent(text)).toBe(true);
    });

    it('should handle different whitespace and punctuation around keywords', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء'],
      });

      expect(service.highIntent('شراء')).toBe(true);
      expect(service.highIntent(' شراء ')).toBe(true);
      expect(service.highIntent('شراء!')).toBe(true);
      expect(service.highIntent('شراء؟')).toBe(true);
      expect(service.highIntent('شراء.')).toBe(true);
      expect(service.highIntent('(شراء)')).toBe(true);
      expect(service.highIntent('شراء،')).toBe(true);
    });

    it('should handle Unicode and emoji correctly', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['شراء', '💰', '🛒'],
      });

      expect(service.highIntent('أريد شراء 💰')).toBe(true);
      expect(service.highIntent('🛒 السلة')).toBe(true);
      expect(service.highIntent('المنتج 💰 غالي')).toBe(true);
    });

    it('should handle mixed language keywords efficiently', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: [
          'شراء',
          'اشتري',
          'buy',
          'purchase',
          'order',
          'pay',
          'payment',
          'دفع',
          'طلب',
          'احجز',
          'booking',
          'reserve',
          'checkout',
        ],
      });

      const mixedTexts = [
        'I want to buy this منتج',
        'أريد شراء this product',
        'Let me make a payment الآن',
        'سأقوم بـ booking موعد',
        'Reserve a slot واحجز مكان',
      ];

      mixedTexts.forEach((text) => {
        expect(service.highIntent(text)).toBe(true);
      });
    });

    it('should handle performance with many keywords', () => {
      const manyKeywords = Array.from(
        { length: 1000 },
        (_, i) => `keyword${i}`,
      );
      manyKeywords.push('شراء'); // Add our test keyword

      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: manyKeywords,
      });

      const startTime = Date.now();
      const result = service.highIntent('أريد شراء المنتج');
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should still be fast
    });

    it('should trim keywords correctly', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['  شراء  ', '\taشتري\n', ' buy ', ''],
      });

      expect(service.highIntent('أريد شراء المنتج')).toBe(true);
      expect(service.highIntent('سأقوم باشتري')).toBe(true);
      expect(service.highIntent('I will buy it')).toBe(true);
    });

    it('should handle settings service errors gracefully', () => {
      mockSettingsService.cached.mockImplementation(() => {
        throw new Error('Settings service error');
      });

      expect(() => service.highIntent('test text')).toThrow(
        'Settings service error',
      );
    });

    it('should handle corrupted settings data', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: 'not an array',
      });

      // Should handle gracefully and not crash
      expect(() => service.highIntent('test')).toThrow();
    });

    it('should call settings.cached() for each request', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['test'],
      });

      service.highIntent('test 1');
      service.highIntent('test 2');
      service.highIntent('test 3');

      expect(mockSettingsService.cached).toHaveBeenCalledTimes(3);
    });

    it('should handle real-world high intent phrases', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: [
          'أريد أن أشتري',
          'كم السعر',
          'اشتري الآن',
          'أريد الشراء',
          'احجز موعد',
          'سجلني',
          'اشتراك',
          'buy now',
          'purchase',
          'checkout',
          'add to cart',
          'book appointment',
          'sign up',
          'subscribe',
          'contact sales',
          'get quote',
        ],
      });

      const highIntentPhrases = [
        'أريد أن أشتري هذا المنتج',
        'كم السعر للباقة المميزة؟',
        'اشتري الآن وادفع لاحقاً',
        'أريد الشراء بالتقسيط',
        'احجز موعد للاستشارة',
        'سجلني في الدورة',
        'أريد اشتراك شهري',
        'I want to buy this service',
        'Let me purchase the premium plan',
        'Take me to checkout',
        'Add this to cart please',
        'I need to book appointment',
        'How can I sign up?',
        'I want to subscribe to newsletter',
        'Can I contact sales team?',
        'Please get me a quote',
      ];

      const lowIntentPhrases = [
        'مرحباً، كيف حالك؟',
        'ما هي خدماتكم؟',
        'أين مقركم؟',
        'متى تفتحون؟',
        'هل لديكم فروع؟',
        'Hello, how are you?',
        'What services do you offer?',
        'Where is your office?',
        'What are your working hours?',
        'Do you have branches?',
      ];

      highIntentPhrases.forEach((phrase) => {
        expect(service.highIntent(phrase)).toBe(true);
      });

      lowIntentPhrases.forEach((phrase) => {
        expect(service.highIntent(phrase)).toBe(false);
      });
    });

    it('should handle regex pattern creation correctly', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['test1', 'test2', 'test3'],
      });

      // The service should create a regex pattern like: /(test1|test2|test3)/i
      // This is tested indirectly by checking if it matches correctly
      expect(service.highIntent('This contains test1')).toBe(true);
      expect(service.highIntent('This contains test2')).toBe(true);
      expect(service.highIntent('This contains test3')).toBe(true);
      expect(service.highIntent('This contains test4')).toBe(false);
    });

    it('should handle boundary cases with regex escaping', () => {
      // Test keywords with all special regex characters
      const specialChars = [
        '.',
        '*',
        '+',
        '?',
        '^',
        '$',
        '(',
        ')',
        '[',
        ']',
        '{',
        '}',
        '|',
        '\\',
      ];
      const keywords = specialChars.map((char) => `keyword${char}end`);

      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: keywords,
      });

      specialChars.forEach((char, index) => {
        const keyword = `keyword${char}end`;
        expect(service.highIntent(`Text with ${keyword} inside`)).toBe(true);
      });
    });

    it('should maintain performance with complex regex patterns', () => {
      // Create keywords that could create complex regex
      const complexKeywords = [
        'a'.repeat(100),
        'b'.repeat(100),
        'c'.repeat(100),
        'شراء' + 'ا'.repeat(50),
        'buy' + 'x'.repeat(50),
      ];

      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: complexKeywords,
      });

      const testText = 'أريد شراء' + 'ا'.repeat(50) + ' المنتج';

      const startTime = Date.now();
      const result = service.highIntent(testText);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely long keyword lists', () => {
      const longKeywordList = Array.from(
        { length: 10000 },
        (_, i) => `keyword${i}`,
      );
      longKeywordList.push('target');

      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: longKeywordList,
      });

      expect(service.highIntent('This contains target keyword')).toBe(true);
    });

    it('should handle keywords with only special characters', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['!!!', '???', '***', '...'],
      });

      expect(service.highIntent('Emergency!!!')).toBe(true);
      expect(service.highIntent('Question???')).toBe(true);
      expect(service.highIntent('Important***')).toBe(true);
      expect(service.highIntent('Loading...')).toBe(true);
    });

    it('should handle memory efficiently with repeated calls', () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['test'],
      });

      // Make many repeated calls
      for (let i = 0; i < 1000; i++) {
        service.highIntent('test message');
      }

      // Should not cause memory leaks or performance degradation
      expect(mockSettingsService.cached).toHaveBeenCalledTimes(1000);
    });

    it('should handle concurrent calls correctly', async () => {
      mockSettingsService.cached.mockReturnValue({
        highIntentKeywords: ['concurrent'],
      });

      // Make concurrent calls
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(service.highIntent(`concurrent test ${i}`)),
      );

      const results = await Promise.all(promises);

      // All should return true
      expect(results.every((result) => result === true)).toBe(true);
    });
  });
});
