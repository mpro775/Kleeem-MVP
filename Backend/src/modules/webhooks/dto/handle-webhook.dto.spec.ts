import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { HandleWebhookDto } from './handle-webhook.dto';

describe('HandleWebhookDto', () => {
  describe('Validation', () => {
    it('should validate valid HandleWebhookDto', async () => {
      const validDto = {
        eventType: 'product.updated',
        payload: {
          productId: '64a2e3f2a9d1c2bce8351b32',
          changes: { price: 99.99, stock: 50 },
          timestamp: Date.now(),
        },
      };

      const dto = plainToClass(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate HandleWebhookDto without payload', async () => {
      const validDto = {
        eventType: 'user.login',
      };

      const dto = plainToClass(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate HandleWebhookDto with null payload', async () => {
      const validDto = {
        eventType: 'system.heartbeat',
        payload: null,
      };

      const dto = plainToClass(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation when eventType is missing', async () => {
      const invalidDto = {
        payload: { data: 'some data' },
      };

      const dto = plainToClass(HandleWebhookDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when eventType is empty string', async () => {
      const invalidDto = {
        eventType: '',
        payload: { data: 'test' },
      };

      const dto = plainToClass(HandleWebhookDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when eventType is not string', async () => {
      const invalidDto = {
        eventType: 123,
        payload: { data: 'test' },
      };

      const dto = plainToClass(HandleWebhookDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventType');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when payload is not object (when provided)', async () => {
      const invalidDto = {
        eventType: 'test.event',
        payload: 'not-an-object',
      };

      const dto = plainToClass(HandleWebhookDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('payload');
      expect(errors[0].constraints).toHaveProperty('isObject');
    });

    it('should fail validation when payload is array', async () => {
      const invalidDto = {
        eventType: 'test.event',
        payload: ['array', 'is', 'not', 'object'],
      };

      const dto = plainToClass(HandleWebhookDto, invalidDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('payload');
      expect(errors[0].constraints).toHaveProperty('isObject');
    });

    it('should validate with undefined payload', async () => {
      const validDto = {
        eventType: 'simple.event',
        payload: undefined,
      };

      const dto = plainToClass(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Event Types', () => {
    const commonEventTypes = [
      'product.created',
      'product.updated',
      'product.deleted',
      'order.created',
      'order.updated',
      'order.completed',
      'order.cancelled',
      'user.registered',
      'user.updated',
      'user.deleted',
      'payment.completed',
      'payment.failed',
      'inventory.low',
      'inventory.out_of_stock',
      'chat.incoming',
      'chat.reply',
      'webhook.test',
      'system.maintenance',
    ];

    it('should validate common event types', async () => {
      for (const eventType of commonEventTypes) {
        const dto = plainToClass(HandleWebhookDto, {
          eventType,
          payload: { test: 'data' },
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle Arabic event types', async () => {
      const arabicEventTypes = [
        'منتج.تم_إنشاؤه',
        'طلب.تم_التحديث',
        'مستخدم.تم_التسجيل',
      ];

      for (const eventType of arabicEventTypes) {
        const dto = plainToClass(HandleWebhookDto, {
          eventType,
          payload: { بيانات: 'اختبار' },
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(eventType);
      }
    });

    it('should handle event types with special characters', async () => {
      const specialEventTypes = [
        'event.with-dashes',
        'event_with_underscores',
        'event.with.dots',
        'event:with:colons',
        'event/with/slashes',
        'EVENT_UPPERCASE',
        'event123with456numbers',
      ];

      for (const eventType of specialEventTypes) {
        const dto = plainToClass(HandleWebhookDto, {
          eventType,
          payload: { data: 'test' },
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(eventType);
      }
    });

    it('should handle very long event types', async () => {
      const longEventType =
        'very.long.event.type.with.many.segments.'.repeat(10) + 'end';

      const dto = plainToClass(HandleWebhookDto, {
        eventType: longEventType,
        payload: { data: 'test' },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.eventType).toBe(longEventType);
      expect(dto.eventType.length).toBeGreaterThan(100);
    });
  });

  describe('Payload Variations', () => {
    it('should handle simple payload', async () => {
      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'simple.test',
        payload: {
          message: 'مرحباً بالعالم',
          timestamp: Date.now(),
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload.message).toBe('مرحباً بالعالم');
    });

    it('should handle complex nested payload', async () => {
      const complexPayload = {
        product: {
          id: 'prod-123',
          name: 'منتج تجريبي',
          price: {
            current: 99.99,
            original: 129.99,
            currency: 'SAR',
          },
          categories: ['electronics', 'phones'],
          specifications: {
            brand: 'Apple',
            model: 'iPhone 14',
            storage: '128GB',
            colors: ['أسود', 'أبيض', 'أحمر'],
          },
        },
        changes: {
          previous: { price: 129.99 },
          current: { price: 99.99 },
          timestamp: '2024-01-01T00:00:00Z',
        },
        metadata: {
          source: 'admin_panel',
          operator: 'system_admin',
          reason: 'promotion',
        },
      };

      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'product.price_changed',
        payload: complexPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload.product.name).toBe('منتج تجريبي');
      expect(dto.payload.product.specifications.colors).toContain('أسود');
      expect(dto.payload.changes.current.price).toBe(99.99);
    });

    it('should handle payload with arrays', async () => {
      const arrayPayload = {
        products: [
          { id: 'prod-1', name: 'منتج أول' },
          { id: 'prod-2', name: 'منتج ثاني' },
          { id: 'prod-3', name: 'منتج ثالث' },
        ],
        categories: ['إلكترونيات', 'هواتف', 'اكسسوارات'],
        tags: ['جديد', 'مميز', 'عرض_خاص'],
        numbers: [1, 2, 3, 4, 5],
      };

      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'bulk.products.updated',
        payload: arrayPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload.products).toHaveLength(3);
      expect(dto.payload.categories).toContain('إلكترونيات');
      expect(dto.payload.numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle payload with mixed data types', async () => {
      const mixedPayload = {
        string: 'نص عربي',
        number: 42,
        float: 3.14159,
        boolean: true,
        null_value: null,
        undefined_value: undefined,
        date: new Date('2024-01-01'),
        array: [1, 'اثنان', true, null],
        object: {
          nested: 'value',
          deep: {
            deeper: 'العمق',
          },
        },
      };

      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'mixed.data.test',
        payload: mixedPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload.string).toBe('نص عربي');
      expect(dto.payload.number).toBe(42);
      expect(dto.payload.boolean).toBe(true);
      expect(dto.payload.null_value).toBeNull();
      expect(dto.payload.object.deep.deeper).toBe('العمق');
    });

    it('should handle very large payload', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `عنصر رقم ${i}`,
        data: 'بيانات '.repeat(100), // Large string
      }));

      const largePayload = {
        items: largeArray,
        metadata: {
          count: largeArray.length,
          totalSize: 'very_large',
        },
      };

      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'bulk.large.operation',
        payload: largePayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload.items).toHaveLength(1000);
      expect(dto.payload.metadata.count).toBe(1000);
    });

    it('should handle payload with special characters and emojis', async () => {
      const specialPayload = {
        message: 'مرحباً! 👋 كيف حالك؟ 😊',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        quotes: 'نص مع "علامات اقتباس" و\'علامات مفردة\'',
        unicode: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', // Arabic
        html: '<h1>عنوان</h1><p>فقرة مع <strong>تأكيد</strong></p>',
        json: '{"key": "value", "عربي": "قيمة"}',
      };

      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'special.characters.test',
        payload: specialPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload.message).toContain('👋');
      expect(dto.payload.unicode).toBe('العربية');
      expect(dto.payload.html).toContain('<h1>');
    });

    it('should handle empty payload object', async () => {
      const dto = plainToClass(HandleWebhookDto, {
        eventType: 'empty.payload.test',
        payload: {},
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload).toEqual({});
      expect(Object.keys(dto.payload)).toHaveLength(0);
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all properties', () => {
      const data = {
        eventType: 'assignment.test',
        payload: {
          test: 'data',
          nested: {
            value: 'deep',
          },
        },
      };

      const dto = plainToClass(HandleWebhookDto, data);

      expect(dto.eventType).toBe(data.eventType);
      expect(dto.payload).toEqual(data.payload);
      expect(dto.payload.nested.value).toBe('deep');
    });

    it('should handle assignment without payload', () => {
      const data = {
        eventType: 'no.payload.test',
      };

      const dto = plainToClass(HandleWebhookDto, data);

      expect(dto.eventType).toBe(data.eventType);
      expect(dto.payload).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in eventType', async () => {
      const data = {
        eventType: '  event.with.spaces  ',
        payload: { data: 'test' },
      };

      const dto = plainToClass(HandleWebhookDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.eventType).toBe('  event.with.spaces  ');
    });

    it('should handle only whitespace eventType as invalid', async () => {
      const data = {
        eventType: '   \t\n   ',
        payload: { data: 'test' },
      };

      const dto = plainToClass(HandleWebhookDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should handle circular reference in payload', () => {
      const circularObj: any = {
        eventType: 'circular.test',
        payload: {
          data: 'value',
        },
      };

      // Create circular reference
      circularObj.payload.self = circularObj.payload;

      const dto = plainToClass(HandleWebhookDto, circularObj);

      expect(dto.eventType).toBe('circular.test');
      expect(dto.payload.data).toBe('value');
      expect(dto.payload.self).toBe(dto.payload);
    });

    it('should handle function in payload', () => {
      const data = {
        eventType: 'function.test',
        payload: {
          normalField: 'value',
          functionField: function () {
            return 'test';
          },
        },
      };

      const dto = plainToClass(HandleWebhookDto, data);

      expect(dto.eventType).toBe('function.test');
      expect(dto.payload.normalField).toBe('value');
      expect(typeof dto.payload.functionField).toBe('function');
    });

    it('should handle Date objects in payload', () => {
      const now = new Date();
      const data = {
        eventType: 'date.test',
        payload: {
          createdAt: now,
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          timestamp: Date.now(),
        },
      };

      const dto = plainToClass(HandleWebhookDto, data);

      expect(dto.payload.createdAt).toEqual(now);
      expect(dto.payload.updatedAt).toBeInstanceOf(Date);
      expect(typeof dto.payload.timestamp).toBe('number');
    });

    it('should handle RegExp in payload', () => {
      const data = {
        eventType: 'regex.test',
        payload: {
          pattern: /test.*pattern/gi,
          simple: 'value',
        },
      };

      const dto = plainToClass(HandleWebhookDto, data);

      expect(dto.payload.pattern).toBeInstanceOf(RegExp);
      expect(dto.payload.pattern.source).toBe('test.*pattern');
      expect(dto.payload.simple).toBe('value');
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const originalData = {
        eventType: 'serialization.test',
        payload: {
          timestamp: Date.now(),
          data: 'بيانات تجريبية',
          nested: {
            value: 'deep value',
            number: 42,
          },
        },
      };

      const dto = plainToClass(HandleWebhookDto, originalData);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);
      const newDto = plainToClass(HandleWebhookDto, deserialized);

      expect(newDto.eventType).toBe(originalData.eventType);
      expect(newDto.payload).toEqual(originalData.payload);
    });

    it('should handle JSON serialization with special characters', () => {
      const data = {
        eventType: 'json.special.test',
        payload: {
          quotes: 'text with "quotes" and \'single quotes\'',
          backslash: 'path\\to\\file',
          unicode: 'Unicode: \u0627\u0644\u0639\u0631\u0628\u064A\u0629',
          newlines: 'line1\nline2\r\nline3',
          tabs: 'col1\tcol2\tcol3',
        },
      };

      const dto = plainToClass(HandleWebhookDto, data);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.payload.quotes).toContain('"quotes"');
      expect(deserialized.payload.unicode).toContain('العربية');
      expect(deserialized.payload.newlines).toContain('\n');
    });

    it('should handle serialization without payload', () => {
      const data = {
        eventType: 'no.payload.serialization',
      };

      const dto = plainToClass(HandleWebhookDto, data);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.eventType).toBe('no.payload.serialization');
      expect(deserialized.payload).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types at compile time', () => {
      const dto = new HandleWebhookDto();

      // These should be type-safe assignments
      dto.eventType = 'string-value';
      dto.payload = { key: 'value' };
      dto.payload = undefined;

      expect(typeof dto.eventType).toBe('string');
    });

    it('should handle undefined and null values correctly', async () => {
      const data = {
        eventType: 'null.undefined.test',
        payload: {
          definedField: 'value',
          undefinedField: undefined,
          nullField: null,
        },
      };

      const dto = plainToClass(HandleWebhookDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.payload.definedField).toBe('value');
      expect(dto.payload.undefinedField).toBeUndefined();
      expect(dto.payload.nullField).toBeNull();
    });
  });

  describe('Real-world Examples', () => {
    it('should handle e-commerce webhook payloads', async () => {
      const ecommercePayloads = [
        {
          eventType: 'order.created',
          payload: {
            orderId: 'order-123',
            customerId: 'customer-456',
            items: [
              { productId: 'prod-1', quantity: 2, price: 99.99 },
              { productId: 'prod-2', quantity: 1, price: 149.99 },
            ],
            total: 349.97,
            currency: 'SAR',
            shippingAddress: {
              street: 'شارع الملك فهد',
              city: 'الرياض',
              country: 'المملكة العربية السعودية',
            },
          },
        },
        {
          eventType: 'payment.completed',
          payload: {
            paymentId: 'pay-789',
            orderId: 'order-123',
            amount: 349.97,
            method: 'credit_card',
            gateway: 'stripe',
            status: 'succeeded',
          },
        },
        {
          eventType: 'inventory.low',
          payload: {
            productId: 'prod-1',
            currentStock: 5,
            threshold: 10,
            reorderPoint: 20,
          },
        },
      ];

      for (const data of ecommercePayloads) {
        const dto = plainToClass(HandleWebhookDto, data);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(data.eventType);
        expect(dto.payload).toEqual(data.payload);
      }
    });

    it('should handle chat and messaging webhook payloads', async () => {
      const messagingPayloads = [
        {
          eventType: 'chat.incoming',
          payload: {
            sessionId: 'session-123',
            messageId: 'msg-456',
            text: 'مرحباً، أريد الاستفسار عن المنتجات',
            channel: 'whatsapp',
            from: '+966501234567',
            timestamp: Date.now(),
          },
        },
        {
          eventType: 'chat.reply',
          payload: {
            sessionId: 'session-123',
            replyId: 'reply-789',
            text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
            channel: 'whatsapp',
            to: '+966501234567',
            timestamp: Date.now(),
          },
        },
      ];

      for (const data of messagingPayloads) {
        const dto = plainToClass(HandleWebhookDto, data);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(data.eventType);
        expect(dto.payload.text).toBeDefined();
      }
    });

    it('should handle system and monitoring webhook payloads', async () => {
      const systemPayloads = [
        {
          eventType: 'system.alert',
          payload: {
            level: 'error',
            message: 'Database connection timeout',
            service: 'webhooks-service',
            timestamp: Date.now(),
            metadata: {
              hostname: 'server-01',
              process_id: 12345,
              memory_usage: '85%',
            },
          },
        },
        {
          eventType: 'performance.threshold',
          payload: {
            metric: 'response_time',
            value: 5000,
            threshold: 3000,
            unit: 'ms',
            endpoint: '/api/webhooks/handle',
          },
        },
      ];

      for (const data of systemPayloads) {
        const dto = plainToClass(HandleWebhookDto, data);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(data.eventType);
      }
    });
  });
});
