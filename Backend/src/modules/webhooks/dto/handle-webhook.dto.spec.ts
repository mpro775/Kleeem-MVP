import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { HandleWebhookDto } from './handle-webhook.dto';

/** Type guards */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}
function asArray<T = unknown>(v: unknown): T[] | undefined {
  return Array.isArray(v) ? (v as T[]) : undefined;
}
function hasKey<T extends string>(
  obj: Record<string, unknown>,
  key: T,
): obj is Record<T, unknown> & Record<string, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key) as boolean;
}

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

      const dto = plainToInstance(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate HandleWebhookDto without payload', async () => {
      const validDto = {
        eventType: 'user.login',
      };

      const dto = plainToInstance(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate HandleWebhookDto with null payload', async () => {
      const validDto = {
        eventType: 'system.heartbeat',
        payload: null,
      };

      const dto = plainToInstance(HandleWebhookDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation when eventType is missing', async () => {
      const invalidDto = {
        payload: { data: 'some data' },
      };

      const dto = plainToInstance(HandleWebhookDto, invalidDto);
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

      const dto = plainToInstance(HandleWebhookDto, invalidDto);
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

      const dto = plainToInstance(HandleWebhookDto, invalidDto);
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

      const dto = plainToInstance(HandleWebhookDto, invalidDto);
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

      const dto = plainToInstance(HandleWebhookDto, invalidDto);
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

      const dto = plainToInstance(HandleWebhookDto, validDto);
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
    ] as const;

    it('should validate common event types', async () => {
      for (const eventType of commonEventTypes) {
        const dto = plainToInstance(HandleWebhookDto, {
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
      ] as const;

      for (const eventType of arabicEventTypes) {
        const dto = plainToInstance(HandleWebhookDto, {
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
      ] as const;

      for (const eventType of specialEventTypes) {
        const dto = plainToInstance(HandleWebhookDto, {
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

      const dto = plainToInstance(HandleWebhookDto, {
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
      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'simple.test',
        payload: {
          message: 'مرحباً بالعالم',
          timestamp: Date.now(),
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      expect(
        isRecord(dto.payload) ? asString(dto.payload.message) : undefined,
      ).toBe('مرحباً بالعالم');
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
      } as const;

      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'product.price_changed',
        payload: complexPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      if (isRecord(dto.payload) && isRecord(dto.payload.product)) {
        expect(asString(dto.payload.product.name)).toBe('منتج تجريبي');
        const specs = isRecord(dto.payload.product.specifications)
          ? dto.payload.product.specifications
          : undefined;
        const colors = specs ? asArray<string>(specs.colors) : undefined;
        expect(colors).toBeDefined();
        expect(colors?.includes('أسود')).toBe(true);
      }

      if (isRecord(dto.payload) && isRecord(dto.payload.changes)) {
        const current = isRecord(dto.payload.changes.current)
          ? dto.payload.changes.current
          : undefined;
        expect(asNumber(current?.price)).toBe(99.99);
      }
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

      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'bulk.products.updated',
        payload: arrayPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      if (isRecord(dto.payload)) {
        const products = asArray<Record<string, unknown>>(dto.payload.products);
        expect(products?.length).toBe(3);

        const categories = asArray<string>(dto.payload.categories);
        expect(categories?.includes('إلكترونيات')).toBe(true);

        const nums = asArray<number>(dto.payload.numbers);
        expect(nums).toEqual([1, 2, 3, 4, 5]);
      }
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

      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'mixed.data.test',
        payload: mixedPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      if (isRecord(dto.payload)) {
        expect(asString(dto.payload.string)).toBe('نص عربي');
        expect(asNumber(dto.payload.number)).toBe(42);
        expect(dto.payload.boolean).toBe(true);
        expect(dto.payload.null_value).toBeNull();

        const obj = isRecord(dto.payload.object) ? dto.payload.object : {};
        const deep = isRecord(obj.deep) ? obj.deep : {};
        expect(asString(deep.deeper)).toBe('العمق');
      }
    });

    it('should handle very large payload', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `عنصر رقم ${i}`,
        data: 'بيانات '.repeat(100),
      }));

      const largePayload = {
        items: largeArray,
        metadata: {
          count: largeArray.length,
          totalSize: 'very_large',
        },
      };

      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'bulk.large.operation',
        payload: largePayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      if (isRecord(dto.payload)) {
        const items = asArray<Record<string, unknown>>(dto.payload.items);
        expect(items?.length).toBe(1000);

        const md = isRecord(dto.payload.metadata)
          ? dto.payload.metadata
          : undefined;
        expect(asNumber(md?.count)).toBe(1000);
      }
    });

    it('should handle payload with special characters and emojis', async () => {
      const specialPayload = {
        message: 'مرحباً! 👋 كيف حالك؟ 😊',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        quotes: 'نص مع "علامات اقتباس" و\'علامات مفردة\'',
        unicode: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
        html: '<h1>عنوان</h1><p>فقرة مع <strong>تأكيد</strong></p>',
        json: '{"key": "value", "عربي": "قيمة"}',
      };

      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'special.characters.test',
        payload: specialPayload,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      if (isRecord(dto.payload)) {
        expect(asString(dto.payload.message)?.includes('👋')).toBe(true);
        expect(asString(dto.payload.unicode)).toBe('العربية');
        expect(asString(dto.payload.html)?.includes('<h1>')).toBe(true);
      }
    });

    it('should handle empty payload object', async () => {
      const dto = plainToInstance(HandleWebhookDto, {
        eventType: 'empty.payload.test',
        payload: {},
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.payload).toEqual({});
      expect(Object.keys(dto.payload ?? {})).toHaveLength(0);
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

      const dto = plainToInstance(HandleWebhookDto, data);

      expect(dto.eventType).toBe(data.eventType);
      expect(dto.payload).toEqual(data.payload);
      if (isRecord(dto.payload) && isRecord(dto.payload.nested)) {
        expect(asString(dto.payload.nested.value)).toBe('deep');
      }
    });

    it('should handle assignment without payload', () => {
      const data = {
        eventType: 'no.payload.test',
      };

      const dto = plainToInstance(HandleWebhookDto, data);

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

      const dto = plainToInstance(HandleWebhookDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.eventType).toBe('  event.with.spaces  ');
    });

    it('should handle only whitespace eventType as invalid', async () => {
      const data = {
        eventType: '   \t\n   ',
        payload: { data: 'test' },
      };

      const dto = plainToInstance(HandleWebhookDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should handle circular reference in payload', () => {
      const circularObj: {
        eventType: string;
        payload: Record<string, unknown>;
      } = {
        eventType: 'circular.test',
        payload: { data: 'value' },
      };

      // Create circular reference
      circularObj.payload.self = circularObj.payload;

      const dto = plainToInstance(HandleWebhookDto, circularObj);

      expect(dto.eventType).toBe('circular.test');
      if (isRecord(dto.payload)) {
        expect(asString(dto.payload.data)).toBe('value');
        expect(dto.payload.self).toBe(dto.payload);
      }
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

      const dto = plainToInstance(HandleWebhookDto, data);

      expect(dto.eventType).toBe('function.test');
      if (isRecord(dto.payload)) {
        expect(asString(dto.payload.normalField)).toBe('value');
        expect(typeof dto.payload.functionField).toBe('function');
      }
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

      const dto = plainToInstance(HandleWebhookDto, data);

      if (isRecord(dto.payload)) {
        expect(dto.payload.createdAt).toEqual(now);
        expect(dto.payload.updatedAt).toBeInstanceOf(Date);
        expect(typeof dto.payload.timestamp).toBe('number');
      }
    });

    it('should handle RegExp in payload', () => {
      const data = {
        eventType: 'regex.test',
        payload: {
          pattern: /test.*pattern/gi,
          simple: 'value',
        },
      };

      const dto = plainToInstance(HandleWebhookDto, data);

      if (isRecord(dto.payload)) {
        const pattern = dto.payload.pattern;
        expect(pattern instanceof RegExp).toBe(true);
        expect((pattern as RegExp).source).toBe('test.*pattern');
        expect(asString(dto.payload.simple)).toBe('value');
      }
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

      const dto = plainToInstance(HandleWebhookDto, originalData);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);
      const newDto = plainToInstance(HandleWebhookDto, deserialized);

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

      const dto = plainToInstance(HandleWebhookDto, data);
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);

      if (isRecord(deserialized.payload)) {
        expect(
          asString(deserialized.payload.quotes)?.includes('"quotes"'),
        ).toBe(true);
        expect(
          asString(deserialized.payload.unicode)?.includes('العربية'),
        ).toBe(true);
        expect(asString(deserialized.payload.newlines)?.includes('\n')).toBe(
          true,
        );
      }
    });

    it('should handle serialization without payload', () => {
      const data = {
        eventType: 'no.payload.serialization',
      };

      const dto = plainToInstance(HandleWebhookDto, data);
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

      const dto = plainToInstance(HandleWebhookDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);

      if (isRecord(dto.payload)) {
        expect(asString(dto.payload.definedField)).toBe('value');
        expect(dto.payload.undefinedField).toBeUndefined();
        expect(dto.payload.nullField).toBeNull();
      }
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
      ] as const;

      for (const data of ecommercePayloads) {
        const dto = plainToInstance(HandleWebhookDto, data);
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
      ] as const;

      for (const data of messagingPayloads) {
        const dto = plainToInstance(HandleWebhookDto, data);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(data.eventType);
        if (isRecord(dto.payload) && hasKey(dto.payload, 'text')) {
          expect(typeof dto.payload.text).toBe('string');
        }
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
      ] as const;

      for (const data of systemPayloads) {
        const dto = plainToInstance(HandleWebhookDto, data);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.eventType).toBe(data.eventType);
      }
    });
  });
});
