// src/modules/messaging/message.spec.ts
// اختبارات وحدة تغطي: MessageService + MessageController + ChatLinksController + GeminiService
// Arrange–Act–Assert بدون أي I/O حقيقي.
/* eslint-disable @typescript-eslint/unbound-method */

import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Model, Types } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { MessageService } from '../message.service';
import { MessageController } from '../message.controller';
import { GeminiService } from '../gemini.service';
import { ChatGateway } from '../../chat/chat.gateway';
import { ChatLinksController } from '../chat-links.controller';
import { MessageSessionDocument } from '../schemas/message.schema';

// ====== مكاتبة الوحدات الخارجية ======
// stopword
const removeStopwordsMock = jest.fn((tokens: string[]) =>
  tokens.filter((t) => !['و', 'the', 'a'].includes(t)),
);
jest.mock('stopword', () => ({
  removeStopwords: (tokens: string[]) => removeStopwordsMock(tokens),
  ara: ['و'],
  eng: ['the', 'a'],
}));

// uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-1234') }));

// @google/generative-ai (لإختبارات GeminiService فقط)
const generateContentMock = jest.fn();
const getGenerativeModelMock = jest.fn(() => ({
  generateContent: generateContentMock,
}));
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: getGenerativeModelMock,
  })),
}));

describe('MessageService', () => {
  let model: DeepMockProxy<Model<MessageSessionDocument>>;
  let gateway: DeepMockProxy<ChatGateway>;
  let gemini: DeepMockProxy<GeminiService>;
  let service: MessageService;

  beforeEach(() => {
    model = mockDeep<Model<MessageSessionDocument>>();
    gateway = mockDeep<ChatGateway>();
    gemini = mockDeep<GeminiService>();

    service = new MessageService(model as any, gateway as any, gemini as any);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('createOrAppend', () => {
    const merchantId = new Types.ObjectId().toHexString();

    it('ينشئ وثيقة جديدة عند عدم وجود جلسة سابقة، ويحسب keywords ويرسل آخر رسالة عبر الـ Gateway', async () => {
      const dto = {
        merchantId,
        sessionId: '9665xxxx',
        channel: 'whatsapp',
        messages: [
          { role: 'customer', text: 'مرحبا و أهلا', metadata: { x: 1 } },
          { role: 'bot', text: 'the product is available', metadata: {} },
        ],
      };

      // findOne().session().exec() → null
      const chain = {
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      (model.findOne as any).mockReturnValue(chain);

      // create([...], {session})
      const createdDoc: any = { _id: 'doc1' };
      (model.create as any).mockResolvedValue([createdDoc]);

      const res = await service.createOrAppend(dto as any);

      expect(model.findOne).toHaveBeenCalledWith({
        merchantId: new Types.ObjectId(merchantId),
        sessionId: dto.sessionId,
        channel: dto.channel,
      });
      expect(chain.session).toHaveBeenCalledWith(null);
      // كلمات مفتاحية محسوبة عبر removeStopwords
      expect(removeStopwordsMock).toHaveBeenCalled();
      // create يستلم مصفوفة واحدة مع messages محسوبة
      expect(model.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            merchantId: expect.any(Types.ObjectId),
            sessionId: '9665xxxx',
            channel: 'whatsapp',
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: 'customer',
                text: 'مرحبا و أهلا',
                keywords: expect.arrayContaining(['مرحبا', 'أهلا']),
              }),
            ]),
          }),
        ],
        { session: undefined },
      );
      // تم إرسال آخر رسالة فقط
      expect(gateway.sendMessageToSession).toHaveBeenCalledWith(
        '9665xxxx',
        expect.objectContaining({
          role: 'bot',
          text: 'the product is available',
        }),
      );
      expect(res).toBe(createdDoc);
    });

    it('يلحق على وثيقة موجودة ويستدعي save(session)', async () => {
      const dto = {
        merchantId,
        sessionId: 'S1',
        channel: 'webchat',
        messages: [{ role: 'agent', text: 'Hi there' }],
      };

      const existing = {
        messages: [],
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
      } as any;
      const chain = {
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(existing),
      };
      (model.findOne as any).mockReturnValue(chain);

      const res = await service.createOrAppend(dto as any, undefined);

      expect(existing.markModified).toHaveBeenCalledWith('messages');
      expect(existing.save).toHaveBeenCalledWith({ session: undefined });
      expect(res).toBe(existing);
      expect(gateway.sendMessageToSession).toHaveBeenCalled(); // أُرسل آخر عنصر
    });
  });

  describe('rateMessage', () => {
    it('يحدّث التقييم فقط عند rating>0', async () => {
      model.updateOne.mockResolvedValue({} as any);
      const out = await service.rateMessage('S1', 'M1', 'U1', 5, 'nice');
      expect(model.updateOne).toHaveBeenCalledWith(
        { sessionId: 'S1', 'messages._id': 'M1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            rating: 5,
            feedback: 'nice',
            ratedBy: 'U1',
          }),
        }),
      );
      expect(out).toEqual({ status: 'ok' });
      expect(
        gemini.generateAndSaveInstructionFromBadReply,
      ).not.toHaveBeenCalled();
    });

    it('عند rating=0: يستخرج نص الرسالة ويستدعي GeminiService لتوليد وحفظ تعليمات', async () => {
      model.updateOne.mockResolvedValue({} as any);
      const sess = {
        messages: [
          {
            _id: new Types.ObjectId('64a4e0d1a1a1a1a1a1a1a1a1'),
            text: 'رد سيء',
            role: 'bot',
          },
        ],
      } as any;
      model.findOne.mockResolvedValue(sess);

      await service.rateMessage(
        'S1',
        '64a4e0d1a1a1a1a1a1a1a1a1',
        'U1',
        0,
        'bad',
      );

      expect(
        gemini.generateAndSaveInstructionFromBadReply,
      ).toHaveBeenCalledWith('رد سيء', undefined);
    });
  });

  describe('findBySession/findById/update/remove', () => {
    it('findBySession: يعيد exec()', async () => {
      const doc: any = { _id: '1' };
      const chain = { exec: jest.fn().mockResolvedValue(doc) };
      (model.findOne as any).mockReturnValue(chain);

      const res = await service.findBySession('S1');
      expect(model.findOne).toHaveBeenCalledWith({ sessionId: 'S1' });
      expect(chain.exec).toHaveBeenCalled();
      expect(res).toBe(doc);
    });

    it('findById: يرمي NotFound عند عدم الوجود', async () => {
      const chain = { exec: jest.fn().mockResolvedValue(null) };
      (model.findById as any).mockReturnValue(chain);
      await expect(service.findById('X')).rejects.toThrow(NotFoundException);
    });

    it('update: يعيد الوثيقة المحدّثة أو يرمي NotFound', async () => {
      const chain = { exec: jest.fn().mockResolvedValue({ _id: '1' }) };
      (model.findByIdAndUpdate as any).mockReturnValue(chain);
      await expect(
        service.update('1', { channel: 'webchat' } as any),
      ).resolves.toEqual({ _id: '1' });

      (model.findByIdAndUpdate as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.update('1', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('remove: يعيد {deleted:true/false}', async () => {
      (model.deleteOne as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });
      await expect(service.remove('1')).resolves.toEqual({ deleted: true });

      (model.deleteOne as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });
      await expect(service.remove('1')).resolves.toEqual({ deleted: false });
    });
  });

  describe('getFrequentBadBotReplies', () => {
    it('يحوّل نتائج aggregate إلى {text,count,feedbacks[]}', async () => {
      (model.aggregate as any).mockResolvedValue([
        { _id: 'سيء', count: 3, feedbacks: ['X', null, 'Y'] },
      ]);
      const out = await service.getFrequentBadBotReplies(10);
      expect(model.aggregate).toHaveBeenCalled();
      expect(out).toEqual([{ text: 'سيء', count: 3, feedbacks: ['X', 'Y'] }]);
    });
  });

  describe('findAll (مع فلاتر)', () => {
    it('يبني Query بالـ merchantId كـ ObjectId والقناة ويعيد {data,total}', async () => {
      const merchantId = new Types.ObjectId().toHexString();
      model.countDocuments.mockResolvedValue(2 as any);
      const chain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }]),
      };
      (model.find as any).mockReturnValue(chain);

      const res = await service.findAll({
        merchantId,
        channel: 'webchat',
        limit: 5,
        page: 2,
      });

      expect(model.countDocuments).toHaveBeenCalledWith({
        merchantId: expect.any(Types.ObjectId),
        channel: 'webchat',
      });
      expect(model.find).toHaveBeenCalledWith({
        merchantId: expect.any(Types.ObjectId),
        channel: 'webchat',
      });
      expect(chain.skip).toHaveBeenCalledWith((2 - 1) * 5);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(res).toEqual({ data: [{ _id: '1' }, { _id: '2' }], total: 2 });
    });
  });
});

describe('MessageController', () => {
  let moduleRef: TestingModule;
  let controller: MessageController;
  let svc: DeepMockProxy<MessageService>;
  let gemini: DeepMockProxy<GeminiService>;

  beforeEach(async () => {
    svc = mockDeep<MessageService>();
    gemini = mockDeep<GeminiService>();

    moduleRef = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        { provide: MessageService, useValue: svc },
        { provide: GeminiService, useValue: gemini },
      ],
    }).compile();

    controller = moduleRef.get(MessageController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  it('POST /messages → createOrAppend', async () => {
    const dto: any = {
      merchantId: new Types.ObjectId().toHexString(),
      sessionId: 'S',
      channel: 'webchat',
      messages: [],
    };
    const doc: any = { _id: '1' };
    svc.createOrAppend.mockResolvedValue(doc);
    const res = await controller.createOrAppend(dto);
    expect(svc.createOrAppend).toHaveBeenCalledWith(dto);
    expect(res).toBe(doc);
  });

  it('PATCH session/:sessionId/handover → setHandover', async () => {
    svc.setHandover.mockResolvedValue({} as any);
    const out = await controller.setHandover('S1', true as any);
    expect(svc.setHandover).toHaveBeenCalledWith('S1', true);
    expect(out).toEqual({ success: true });
  });

  it('GET session/:sessionId → findBySession', async () => {
    const doc: any = { _id: '1' };
    svc.findBySession.mockResolvedValue(doc);
    const res = await controller.findBySession('S1');
    expect(svc.findBySession).toHaveBeenCalledWith('S1');
    expect(res).toBe(doc);
  });

  it('GET :id → findOne', async () => {
    const doc: any = { _id: '1' };
    svc.findById.mockResolvedValue(doc);
    const res = await controller.findOne('1');
    expect(svc.findById).toHaveBeenCalledWith('1');
    expect(res).toBe(doc);
  });

  it('PATCH :id → update', async () => {
    const updated: any = { _id: '1', tags: ['vip'] };
    svc.update.mockResolvedValue(updated);
    const res = await controller.update('1', { tags: ['vip'] } as any);
    expect(svc.update).toHaveBeenCalledWith('1', { tags: ['vip'] });
    expect(res).toBe(updated);
  });

  it('DELETE :id → remove', async () => {
    svc.remove.mockResolvedValue({ deleted: true });
    const res = await controller.remove('1');
    expect(svc.remove).toHaveBeenCalledWith('1');
    expect(res).toEqual({ deleted: true });
  });

  it('GET /messages → findAll يحوّل limit/page لأرقام', async () => {
    svc.findAll.mockResolvedValue({ data: [], total: 0 } as any);
    await controller.findAll('m1', 'whatsapp', '50' as any, '3' as any);
    expect(svc.findAll).toHaveBeenCalledWith({
      merchantId: 'm1',
      channel: 'whatsapp',
      limit: 50,
      page: 3,
    });
  });

  it('PATCH session/:sessionId/messages/:messageId/rate → يمرّر userId من req', async () => {
    const req = { user: { _id: 'U1' } } as any;
    const body = { rating: 4, feedback: 'ok' };
    gemini.generateAndSaveInstructionFromBadReply.mockResolvedValue({
      instruction: 'x',
      saved: true,
    } as any);
    svc.rateMessage.mockResolvedValue({ status: 'ok' } as any);

    const out = await controller.rateMessage('S1', 'M1', body as any, req);
    expect(svc.rateMessage).toHaveBeenCalledWith('S1', 'M1', 'U1', 4, 'ok');
    expect(out).toEqual({ status: 'ok' });
  });

  it('POST generate-instructions-from-bad-replies → يستدعي Gemini لكل عنصر ويجمع النتائج', async () => {
    gemini.generateAndSaveInstructionFromBadReply
      .mockResolvedValueOnce({ instruction: 'إرشاد 1', saved: true } as any)
      .mockResolvedValueOnce({ instruction: 'إرشاد 2', saved: true } as any);

    const res = await controller.generateInstructions({
      badReplies: ['A', 'B'],
      merchantId: 'm1',
    });

    expect(gemini.generateAndSaveInstructionFromBadReply).toHaveBeenCalledTimes(
      2,
    );
    expect(res).toEqual([
      { badReply: 'A', instruction: 'إرشاد 1' },
      { badReply: 'B', instruction: 'إرشاد 2' },
    ]);
  });

  it('GET bad-bot-instructions → يستخدم frequentBadBotReplies ثم Gemini.generateInstructionFromBadReply', async () => {
    svc.getFrequentBadBotReplies.mockResolvedValue([
      { text: 'X', count: 2, feedbacks: [] },
    ] as any);
    gemini.generateInstructionFromBadReply.mockResolvedValue('تعليمات X');

    const res = await controller.getBadBotInstructions(5 as any);

    expect(svc.getFrequentBadBotReplies).toHaveBeenCalledWith(5);
    expect(gemini.generateInstructionFromBadReply).toHaveBeenCalledWith('X');
    expect(res).toEqual({ instructions: ['تعليمات X'] });
  });

  it('GET :sessionId/ratings → يعيد فقط الرسائل ذات rating != null (يشمل 0)', async () => {
    svc.findBySession.mockResolvedValue({
      messages: [
        { _id: '1', text: 'a', rating: 1 },
        { _id: '2', text: 'b', rating: 0 },
        { _id: '3', text: 'c', rating: null },
      ],
    } as any);

    const out = await controller.getRatedMessages('S1');
    expect(out).toEqual([
      { _id: '1', text: 'a', rating: 1 },
      { _id: '2', text: 'b', rating: 0 },
    ]);
  });
});

describe('ChatLinksController', () => {
  let moduleRef: TestingModule;
  let controller: ChatLinksController;
  let svc: DeepMockProxy<MessageService>;
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      CHAT_EMBED_BASE_URL: 'https://embed.example.com',
    };
    svc = mockDeep<MessageService>();
    moduleRef = await Test.createTestingModule({
      controllers: [ChatLinksController],
      providers: [{ provide: MessageService, useValue: svc }],
    }).compile();

    controller = moduleRef.get(ChatLinksController);
  });

  afterAll(async () => {
    await moduleRef?.close();
    process.env = OLD_ENV;
  });

  it('POST /chat-links/:merchantId → يولّد sessionId ثابت عبر uuid ويهيّئ جلسة ويحسِب URL', async () => {
    svc.createOrAppend.mockResolvedValue({} as any);
    const out = await controller.createChatLink('m123');
    expect(svc.createOrAppend).toHaveBeenCalledWith({
      merchantId: 'm123',
      sessionId: 'uuid-1234',
      channel: 'webchat',
      messages: [],
    });
    expect(out).toEqual({
      sessionId: 'uuid-1234',
      url: 'https://embed.example.com/embed?merchantId=m123&sessionId=uuid-1234',
    });
  });
});

describe('GeminiService (منع الشبكة عبر موك SDK)', () => {
  let gemini: GeminiService;
  const instructions = { create: jest.fn().mockResolvedValue({}) } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    gemini = new GeminiService(instructions);
  });

  it('generateInstructionFromBadReply: يعيد النص الناتج من response.text()', async () => {
    generateContentMock.mockResolvedValueOnce({
      response: { text: () => 'توجيه قصير' },
    });
    const out = await gemini.generateInstructionFromBadReply('رد سيء');
    expect(getGenerativeModelMock).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
    });
    expect(out).toBe('توجيه قصير');
  });

  it('generateInstructionFromBadReply: عند throw داخل text() يعيد رسالة بديلة', async () => {
    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () => {
          throw new Error('blocked');
        },
      },
    });
    const out = await gemini.generateInstructionFromBadReply('X');
    expect(out).toBe('تعذر استخراج التوجيه (محتوى محظور أو مرفوض)');
  });

  it('generateInstructionFromBadReply: عند فشل generateContent يعيد رسالة الاتصال', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('api down'));
    const out = await gemini.generateInstructionFromBadReply('Y');
    expect(out).toBe('تعذر الاتصال بخدمة الذكاء الاصطناعي');
  });

  it('generateAndSaveInstructionFromBadReply: يحفظ في InstructionsService ويعيد saved=true', async () => {
    generateContentMock.mockResolvedValueOnce({
      response: { text: () => 'إرشاد' },
    });
    const res = await gemini.generateAndSaveInstructionFromBadReply(
      'bad',
      'm1',
    );
    expect(instructions.create).toHaveBeenCalledWith({
      merchantId: 'm1',
      instruction: 'إرشاد',
      relatedReplies: ['bad'],
      type: 'auto',
    });
    expect(res).toEqual({ instruction: 'إرشاد', saved: true });
  });
});
