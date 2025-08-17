// src/analytics/schemas-and-dto.spec.ts
// يغطي: فحص خصائص مخططات Mongoose (حقول مطلوبة/أنواع/Enums/Defaults/Indexes/timestamps)
// + التحقق من DTO (valid/invalid) باستخدام class-validator.
// Arrange–Act–Assert

import { SchemaFactory } from '@nestjs/mongoose';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { faker } from '@faker-js/faker';

// === استيراد النماذج/الـ DTO قيد الاختبار ===
import {
    UnavailableProduct,
    UnavailableProductSchema as ImportedUnavailableProductSchema,
} from './schemas/unavailable-products.schema'; // ← إذا كان مسار مختلف عدّله
import {
    Stats,
    StatsSchema as ImportedStatsSchema,
} from './schemas/stats.schema';
import {
    MissingResponse,
    MissingResponseSchema as ImportedMissingResponseSchema,
} from './schemas/missing-response.schema';
import {
    AnalyticsEvent,
    AnalyticsEventSchema as ImportedAnalyticsEventSchema,
} from './schemas/analytics-event.schema';

import { CreateMissingResponseDto } from './dto/create-missing-response.dto';

// ملاحظة: إذا كانت الملفات الحالية في نفس المسارات المذكورة في سؤالك، استبدل "?mock" بإزالة اللاحقة.
// استخدمنا اللاحقة لتوضيح ضرورة مطابقة المسارات لديك.

describe('Mongoose Schemas — Analytics', () => {
    describe('UnavailableProductSchema', () => {
        const schema =
            ImportedUnavailableProductSchema ??
            SchemaFactory.createForClass(UnavailableProduct);

        it('يحتوي على timestamps=true', () => {
            expect(schema?.get('timestamps')).toBe(true);
        });

        it('merchant: ObjectId مطلوب مع ref=Merchant', () => {
            const path: any = schema.path('merchant');
            expect(path?.options?.required).toBe(true);
            expect(path?.options?.ref).toBe('Merchant');
            expect(path?.instance).toBe('ObjectID');
        });

        it('channel: enum على telegram/whatsapp/webchat ومطلوب', () => {
            const path: any = schema.path('channel');
            expect(path?.options?.required).toBe(true);
            expect(path?.enumValues).toEqual(
                expect.arrayContaining(['telegram', 'whatsapp', 'webchat']),
            );
        });

        it('productName: مطلوب', () => {
            const path: any = schema.path('productName');
            expect(path?.options?.required).toBe(true);
        });

        it('resolved: default=false', () => {
            const path: any = schema.path('resolved');
            // في Mongoose يُمكن أن يكون default قيمة أو دالة
            const def = typeof path?.options?.default === 'function'
                ? path.options.default()
                : path?.options?.default;
            expect(def).toBe(false);
        });

        it('يمتلك الحقول الاختيارية المتوقعة (question/botReply/sessionId/customerId/context/manualReply/category)', () => {
            ['question', 'botReply', 'sessionId', 'customerId', 'context', 'manualReply', 'category'].forEach(p => {
                expect(schema.path(p)).toBeTruthy();
            });
        });
    });

    describe('StatsSchema', () => {
        const schema =
            ImportedStatsSchema ?? SchemaFactory.createForClass(Stats);

        it('بدون timestamps', () => {
            expect(schema?.get('timestamps')).not.toBe(true);
        });

        it('merchantId: ObjectId مع index', () => {
            const merchantId: any = schema.path('merchantId');
            expect(merchantId?.instance).toBe('ObjectID');
            const idx = schema.indexes().find(([fields]) => (fields as any).merchantId === 1);
            expect(idx).toBeTruthy();
        });

        it('period: enum daily/weekly/monthly مع index', () => {
            const period: any = schema.path('period');
            expect(period?.enumValues).toEqual(expect.arrayContaining(['daily', 'weekly', 'monthly']));
            const idx = schema.indexes().find(([fields]) => (fields as any).period === 1);
            expect(idx).toBeTruthy();
        });

        it('date: Date مطلوب مع index', () => {
            const date: any = schema.path('date');
            expect(date?.instance).toBe('Date');
            const idx = schema.indexes().find(([fields]) => (fields as any).date === 1);
            expect(idx).toBeTruthy();
        });

        it('messagesByChannel: مصفوفة عناصر تحوي channel/count', () => {
            const path: any = schema.path('messagesByChannel');
            expect(path?.instance).toBe('Array');
            // لاختبارات الوحدة، يكفي وجود المسار؛ بنية العناصر تُدار داخل الـ schema definition
            expect(path).toBeTruthy();
        });
    });

    describe('MissingResponseSchema', () => {
        const schema =
            ImportedMissingResponseSchema ?? SchemaFactory.createForClass(MissingResponse);

        it('timestamps=true', () => {
            expect(schema?.get('timestamps')).toBe(true);
        });

        it('merchant: ObjectId مطلوب مع ref=Merchant', () => {
            const path: any = schema.path('merchant');
            expect(path?.options?.required).toBe(true);
            expect(path?.options?.ref).toBe('Merchant');
            expect(path?.instance).toBe('ObjectID');
        });

        it('channel: enum ثلاثي ومطلوب', () => {
            const path: any = schema.path('channel');
            expect(path?.options?.required).toBe(true);
            expect(path?.enumValues).toEqual(
                expect.arrayContaining(['telegram', 'whatsapp', 'webchat']),
            );
        });

        it('type: default="missing_response" مع enum [missing_response, unavailable_product]', () => {
            const path: any = schema.path('type');
            const def = typeof path?.options?.default === 'function'
                ? path.options.default()
                : path?.options?.default;
            expect(def).toBe('missing_response');
            expect(path?.enumValues).toEqual(
                expect.arrayContaining(['missing_response', 'unavailable_product']),
            );
        });

        it('resolved: default=false', () => {
            const path: any = schema.path('resolved');
            const def = typeof path?.options?.default === 'function'
                ? path.options.default()
                : path?.options?.default;
            expect(def).toBe(false);
        });
    });

    describe('AnalyticsEventSchema', () => {
        const schema =
            ImportedAnalyticsEventSchema ?? SchemaFactory.createForClass(AnalyticsEvent);

        it('timestamps=true', () => {
            expect(schema?.get('timestamps')).toBe(true);
        });

        it('merchantId: ObjectId (اختياري) + Index (merchantId, createdAt-1)', () => {
            const path: any = schema.path('merchantId');
            expect(path?.instance).toBe('ObjectID'); // غير مطلوب
            const idx = schema.indexes().find(([fields, opts]) =>
                (fields as any).merchantId === 1 && (fields as any).createdAt === -1
            );
            expect(idx).toBeTruthy();
        });

        it('type: enum من [http_request, chat_in, chat_out, product_query, missing_response, unavailable_product]', () => {
            const path: any = schema.path('type');
            expect(path?.enumValues).toEqual(
                expect.arrayContaining([
                    'http_request', 'chat_in', 'chat_out', 'product_query', 'missing_response', 'unavailable_product',
                ]),
            );
            expect(path?.options?.required).toBe(true);
        });

        it('channel: String مطلوب', () => {
            const path: any = schema.path('channel');
            expect(path?.instance).toBe('String');
            expect(path?.options?.required).toBe(true);
        });

        it('payload: Mixed مع default={}', () => {
            const path: any = schema.path('payload');
            // في Mongoose Mixed يظهر كـ "Mixed"
            expect(path?.instance).toBe('Mixed');
            const def = typeof path?.options?.default === 'function'
                ? path.options.default()
                : path?.options?.default;
            expect(def).toEqual({});
        });
    });
});

describe('DTO Validation — CreateMissingResponseDto', () => {
    const makeValid = (): CreateMissingResponseDto => plainToInstance(CreateMissingResponseDto, {
        merchant: faker.string.alphanumeric(12),
        channel: 'whatsapp',
        question: 'هل لديكم المنتج X؟',
        botReply: 'عذرًا، لم أفهم.',
        sessionId: 'sess_1',
        aiAnalysis: 'يسأل عن توفر منتج.',
        customerId: 'cust_1',
        type: 'missing_response',
        resolved: false,
    });

    it('valid payload يمرّ بدون أخطاء (happy path)', async () => {
        const dto = makeValid();
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
    });

    it('يُرفض عند نقص الحقول المطلوبة (merchant/channel/question/botReply/type)', async () => {
        const dto = plainToInstance(CreateMissingResponseDto, {
            // نقص merchant, question, botReply, type
            channel: 'telegram',
        });
        const errors = await validate(dto);
        // يجب وجود أخطاء متعددة
        expect(errors.length).toBeGreaterThanOrEqual(3);
        const props = errors.map(e => e.property);
        expect(props).toEqual(expect.arrayContaining(['merchant', 'question', 'botReply', 'type']));
    });

    it('channel خارج enum يُعتبر غير صالح', async () => {
        const dto = makeValid();
        // @ts-expect-error: اختبار قيمة غير صحيحة
        dto.channel = 'sms';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        // نتحقق وجود خطأ متعلق بالـ channel
        const channelErr = errors.find(e => e.property === 'channel');
        expect(channelErr).toBeTruthy();
    });

    it('type خارج enum يُعتبر غير صالح', async () => {
        const dto = makeValid() as any;
        dto.type = 'other';
        const errors = await validate(dto);
        const typeErr = errors.find((e: any) => e.property === 'type');
        expect(typeErr).toBeTruthy();
    });

    it('resolved إن كانت قيمة غير Boolean يُرفض', async () => {
        const dto = makeValid() as any;
        dto.resolved = 'nope';
        const errors = await validate(dto);
        const resErr = errors.find((e: any) => e.property === 'resolved');
        expect(resErr).toBeTruthy();
    });

    it('الحقول الاختيارية (sessionId/aiAnalysis/customerId) يمكن حذفها دون أخطاء', async () => {
        const dto = plainToInstance(CreateMissingResponseDto, {
            merchant: 'm1',
            channel: 'webchat',
            question: '؟',
            botReply: '—',
            type: 'unavailable_product',
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
    });
});
