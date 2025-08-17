// src/chat/__tests__/chat-widget.spec.ts
// اختبارات وحدة لخدمات ودجة الدردشة + الكنترولرات + الجيتواي بدون أي I/O حقيقي.
// تغطي: getSettings/updateSettings/generateWidgetSlug/getSettingsByWidgetSlug/handleHandoff/getEmbedSettings/updateEmbedSettings
// بالإضافة لاختبار كنترولري ChatWidgetController و PublicChatWidgetController، واختبار سلوك ChatGateway.
// Arrange – Act – Assert

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';

import { ChatWidgetService } from '../chat-widget.service';
import { ChatWidgetController } from '../chat-widget.controller';
import { PublicChatWidgetController } from '../public-chat-widget.controller';
import { ChatGateway } from '../chat.gateway';

// ثبّت uuid.v4
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'abc123def456'),
}));
import { v4 as uuidv4 } from 'uuid';

describe('ChatWidgetService (unit)', () => {
  let svc: ChatWidgetService;

  // موك لموديل Mongoose
  let widgetModelMock: any;
  const resetModel = () => {
    widgetModelMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      exists: jest.fn(),
    };
  };

  // موك HttpService: post() يرجع Observable
  const httpMock = {
    post: jest.fn(),
  };

  const leanRes = (val: any) => ({ lean: jest.fn().mockResolvedValue(val) });

  beforeEach(() => {
    jest.clearAllMocks();
    resetModel();
    svc = new ChatWidgetService(widgetModelMock as any, httpMock as any);
  });

  describe('getSettings', () => {
    it('يعيد الإعدادات مباشرة عندما تكون موجودة (lean)', async () => {
      const merchantId = 'm_1';
      const doc = { merchantId, botName: 'Bot', widgetSlug: 'w-1' };
      widgetModelMock.findOne.mockReturnValue(leanRes(doc));

      const out = await svc.getSettings(merchantId);

      expect(widgetModelMock.findOne).toHaveBeenCalledWith({ merchantId });
      expect(out).toBe(doc);
    });

    it('ينشئ إعدادات افتراضية عند عدم وجودها ويعيد toObject()', async () => {
      const merchantId = 'm_2';
      widgetModelMock.findOne.mockReturnValue(leanRes(null));
      const createdObj = { merchantId, botName: 'Musaid Bot', embedMode: 'bubble' };
      widgetModelMock.create.mockResolvedValue({
        toObject: () => createdObj,
      });

      const out = await svc.getSettings(merchantId);

      expect(widgetModelMock.create).toHaveBeenCalledWith({ merchantId });
      expect(out).toEqual(createdObj);
    });
  });

  describe('updateSettings', () => {
    it('يحدّث مع upsert ويعيد كائن toObject()', async () => {
      const merchantId = 'm_3';
      const dto = { botName: 'مساعد' };
      const updatedDoc = { toObject: () => ({ merchantId, botName: 'مساعد' }) };
      widgetModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const out = await svc.updateSettings(merchantId, dto as any);

      expect(widgetModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { merchantId },
        { $set: dto },
        { new: true, upsert: true },
      );
      expect(out).toEqual({ merchantId, botName: 'مساعد' });
    });

    it('يرمي NotFound إذا رجع null (نادرًا مع upsert=false)', async () => {
      const merchantId = 'm_x';
      widgetModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(svc.updateSettings(merchantId, {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('generateWidgetSlug', () => {
    it('يولّد slug من botName دون تعارض', async () => {
      const merchantId = 'm_4';
      // getSettings → موجودة
      widgetModelMock.findOne.mockReturnValueOnce(leanRes({ merchantId, botName: 'My Bot! 123' })); // للـ getSettings
      widgetModelMock.exists.mockResolvedValue(null); // لا تعارض
      widgetModelMock.findOneAndUpdate.mockReturnValue({}); // لا نهتم بالقيمة المرجعة

      const slug = await svc.generateWidgetSlug(merchantId);

      expect(slug).toBe('my-bot-123');
      expect(widgetModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { merchantId },
        { widgetSlug: 'my-bot-123' },
        { new: true },
      );
    });

    it('يلحق لاحقة عشوائية (ثابتة بالموك) عند وجود تعارض', async () => {
      const merchantId = 'm_5';
      widgetModelMock.findOne.mockReturnValueOnce(leanRes({ merchantId, botName: 'Cool Bot' }));
      widgetModelMock.exists.mockResolvedValue({ _id: 'exists' });
      const slug = await svc.generateWidgetSlug(merchantId);

      expect(uuidv4).toHaveBeenCalled();
      expect(slug).toBe('cool-bot-abc123'); // slice(0,6) من abc123def456
    });
  });

  describe('getSettingsByWidgetSlug', () => {
    it('يعيد الإعدادات عندما توجد', async () => {
      widgetModelMock.findOne.mockReturnValue(leanRes({ widgetSlug: 'w1', botName: 'B' }));
      const out = await svc.getSettingsByWidgetSlug('w1');
      expect(out.widgetSlug).toBe('w1');
    });

    it('يرمي NotFound عندما لا توجد', async () => {
      widgetModelMock.findOne.mockReturnValue(leanRes(null));
      await expect(svc.getSettingsByWidgetSlug('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('handleHandoff', () => {
    const merchantId = 'm_6';
    const dto = { sessionId: 'sess_1', note: 'help' };

    it('يرمي BadRequest عندما handoffEnabled=false', async () => {
      // اجعل getSettings تُعيد إعدادات غير مفعّلة
      jest.spyOn(svc, 'getSettings').mockResolvedValue({
        handoffEnabled: false,
      } as any);

      await expect(svc.handleHandoff(merchantId, dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('Slack: يرسل Webhook بالحمولة الصحيحة', async () => {
      jest.spyOn(svc, 'getSettings').mockResolvedValue({
        handoffEnabled: true,
        handoffChannel: 'slack',
        handoffConfig: { webhookUrl: 'https://hooks.slack.test/abc' },
      } as any);
      httpMock.post.mockReturnValue(of({ status: 200 }));

      const res = await svc.handleHandoff(merchantId, dto);

      expect(httpMock.post).toHaveBeenCalledWith('https://hooks.slack.test/abc', {
        text: expect.stringContaining('Handoff requested'),
      });
      expect(res).toEqual({ success: true });
    });

    it('Email: يستدعي API البريد بالحقول الصحيحة', async () => {
      jest.spyOn(svc, 'getSettings').mockResolvedValue({
        handoffEnabled: true,
        handoffChannel: 'email',
        handoffConfig: { apiUrl: 'https://email.api/send', to: 'ops@ex.com' },
      } as any);
      httpMock.post.mockReturnValue(of({ status: 200 }));

      await svc.handleHandoff(merchantId, dto);

      expect(httpMock.post).toHaveBeenCalledWith('https://email.api/send', {
        to: 'ops@ex.com',
        subject: expect.stringContaining(dto.sessionId),
        body: expect.any(String),
      });
    });

    it('Webhook: يرسل الحمولة للعنوان المحدد', async () => {
      jest.spyOn(svc, 'getSettings').mockResolvedValue({
        handoffEnabled: true,
        handoffChannel: 'webhook',
        handoffConfig: { url: 'https://webhook.site/xyz' },
      } as any);
      httpMock.post.mockReturnValue(of({ status: 200 }));

      await svc.handleHandoff(merchantId, dto);

      expect(httpMock.post).toHaveBeenCalledWith('https://webhook.site/xyz', {
        sessionId: 'sess_1',
        note: 'help',
        merchantId: 'm_6',
      });
    });
  });

  describe('getEmbedSettings', () => {
    it('يعيد embedMode و availableModes و shareUrl', async () => {
      widgetModelMock.findOne.mockReturnValue(
        leanRes({ merchantId: 'm_7', widgetSlug: 'w77', embedMode: 'bubble' }),
      );

      const out = await svc.getEmbedSettings('m_7');

      expect(out).toEqual({
        embedMode: 'bubble',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
        shareUrl: '/chat/w77',
      });
    });

    it('يرمي NotFound عند عدم وجود الإعدادات', async () => {
      widgetModelMock.findOne.mockReturnValue(leanRes(null));
      await expect(svc.getEmbedSettings('m_missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateEmbedSettings', () => {
    it('يحدّث embedMode ويعيد shareUrl و availableModes', async () => {
      const updated = { widgetSlug: 'w88', embedMode: 'iframe' };
      widgetModelMock.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(updated),
      });

      const out = await svc.updateEmbedSettings('m_8', { embedMode: 'iframe' });

      expect(widgetModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { merchantId: 'm_8' },
        { embedMode: 'iframe' },
        { new: true },
      );
      expect(out).toEqual({
        embedMode: 'iframe',
        shareUrl: '/chat/w88',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
      });
    });

    it('يرمي NotFound إذا عاد null', async () => {
      widgetModelMock.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(svc.updateEmbedSettings('m_9', { embedMode: 'bar' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('ChatWidgetController (unit)', () => {
  let controller: ChatWidgetController;

  const serviceMock = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    handleHandoff: jest.fn(),
    getEmbedSettings: jest.fn(),
    generateWidgetSlug: jest.fn(),
    updateEmbedSettings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatWidgetController],
      providers: [{ provide: ChatWidgetService, useValue: serviceMock }],
    }).compile();

    controller = module.get(ChatWidgetController);
  });

  it('getSettings: ينادي الخدمة ويعيد الناتج', async () => {
    serviceMock.getSettings.mockResolvedValue({ merchantId: 'm_1' });
    const out = await controller.getSettings('m_1');
    expect(serviceMock.getSettings).toHaveBeenCalledWith('m_1');
    expect(out).toEqual({ merchantId: 'm_1' });
  });

  it('updateSettings: يمرر dto كما هو', async () => {
    const dto = { botName: 'مساعد' };
    serviceMock.updateSettings.mockResolvedValue({ botName: 'مساعد' });
    const out = await controller.updateSettings('m_2', dto as any);
    expect(serviceMock.updateSettings).toHaveBeenCalledWith('m_2', dto);
    expect(out).toEqual({ botName: 'مساعد' });
  });

  it('handoff: يمرر merchantId و dto', async () => {
    const dto = { sessionId: 'sess_1', note: 'hey' };
    serviceMock.handleHandoff.mockResolvedValue({ success: true });
    const out = await controller.handoff('m_3', dto as any);
    expect(serviceMock.handleHandoff).toHaveBeenCalledWith('m_3', dto);
    expect(out).toEqual({ success: true });
  });

  it('getEmbedSettings: يعيد القيم من الخدمة', async () => {
    const resp = { embedMode: 'bubble', shareUrl: '/chat/w', availableModes: ['bubble'] };
    serviceMock.getEmbedSettings.mockResolvedValue(resp);
    const out = await controller.getEmbedSettings('m_4');
    expect(serviceMock.getEmbedSettings).toHaveBeenCalledWith('m_4');
    expect(out).toBe(resp);
  });

  it('getShareUrl: يبني رابط المشاركة من widgetSlug', async () => {
    serviceMock.getSettings.mockResolvedValue({ widgetSlug: 'ws' });
    const out = await controller.getShareUrl('m_5');
    expect(out).toEqual({ url: 'http://localhost:5173/chat/ws' });
  });

  it('generateSlug: يعيد ناتج الخدمة', async () => {
    serviceMock.generateWidgetSlug.mockResolvedValue('slug-1');
    const out = await controller.generateSlug('m_6');
    expect(serviceMock.generateWidgetSlug).toHaveBeenCalledWith('m_6');
    expect(out).toBe('slug-1');
  });

  it('updateEmbedSettings: يمرر embedMode فقط', async () => {
    const dto = { embedMode: 'iframe', botName: 'ignored' } as any;
    serviceMock.updateEmbedSettings.mockResolvedValue({ embedMode: 'iframe' });
    const out = await controller.updateEmbedSettings('m_7', dto);
    expect(serviceMock.updateEmbedSettings).toHaveBeenCalledWith('m_7', { embedMode: 'iframe' });
    expect(out).toEqual({ embedMode: 'iframe' });
  });
});

describe('PublicChatWidgetController (unit)', () => {
  let controller: PublicChatWidgetController;
  const serviceMock = {
    getSettingsByWidgetSlug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicChatWidgetController],
      providers: [{ provide: ChatWidgetService, useValue: serviceMock }],
    }).compile();

    controller = module.get(PublicChatWidgetController);
  });

  it('getByWidgetSlug: ينادي الخدمة بالـ slug ويعيد الناتج', async () => {
    const settings = { widgetSlug: 'w123', botName: 'B' };
    serviceMock.getSettingsByWidgetSlug.mockResolvedValue(settings);
    const out = await controller.getByWidgetSlug('w123');
    expect(serviceMock.getSettingsByWidgetSlug).toHaveBeenCalledWith('w123');
    expect(out).toBe(settings);
  });
});

describe('ChatGateway (unit)', () => {
  let gateway: ChatGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new ChatGateway();
    // موك للسيرفر: to().emit()
    const roomEmit = jest.fn();
    const toMock = jest.fn().mockReturnValue({ emit: roomEmit });
    (gateway as any).server = { to: toMock };
  });

  it('handleConnection: ينضم لغرفة الجلسة، ويدخل admin عند الدور admin', () => {
    const client: any = {
      handshake: { query: { sessionId: 'sessA', role: 'admin' } },
      join: jest.fn(),
      id: 'c1',
    };

    gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('sessA');
    expect(client.join).toHaveBeenCalledWith('admin');
  });

  it('handleConnection: لا يدخل admin عند role عادي، لكن ينضم للجلسة إن وجدت', () => {
    const client: any = {
      handshake: { query: { sessionId: 'sessB', role: 'user' } },
      join: jest.fn(),
      id: 'c2',
    };

    gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('sessB');
    expect(client.join).not.toHaveBeenCalledWith('admin');
  });

  it('sendMessageToSession: يبث للغرفة ولـ admin بالحمولة الصحيحة', () => {
    const toSpy = (gateway as any).server.to as jest.Mock;

    gateway.sendMessageToSession('sessZ', { text: 'hi' });

    // أول نداء للغرفة، ثاني نداء لـ admin
    expect(toSpy).toHaveBeenNthCalledWith(1, 'sessZ');
    expect(toSpy).toHaveBeenNthCalledWith(2, 'admin');

    const room1Emit = toSpy.mock.results[0].value.emit as jest.Mock;
    const room2Emit = toSpy.mock.results[1].value.emit as jest.Mock;

    expect(room1Emit).toHaveBeenCalledWith('message', { text: 'hi' });
    expect(room2Emit).toHaveBeenCalledWith('admin_new_message', { sessionId: 'sessZ', message: { text: 'hi' } });
  });
});
