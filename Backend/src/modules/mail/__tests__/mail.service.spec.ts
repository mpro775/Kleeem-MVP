// src/mail/mail.service.spec.ts
// يغطي MailService: التهيئة من ConfigService، بناء transporter، إرسال الإيميل بنجاح وفشل، وبناء رابط التفعيل.
// Arrange–Act–Assert

import { faker } from '@faker-js/faker';
import { InternalServerErrorException, Logger } from '@nestjs/common';

import { MailService } from '../mail.service';

import type { ConfigService } from '@nestjs/config';

// --- Mock nodemailer (لا اتصالات حقيقية) ---
const sendMailMock = jest.fn();
const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

jest.mock('nodemailer', () => ({
  createTransport: () => createTransportMock(),
}));

// Helper: ConfigService.get mock
function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string): unknown => values[key]),
  } as unknown as ConfigService;
}

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor / config', () => {
    it('ينشئ transporter بالإعدادات الصحيحة ويستخدم MAIL_SECURE الافتراضي false (happy path)', () => {
      const cfg = {
        MAIL_HOST: 'smtp.example.com',
        MAIL_PORT: 587,
        MAIL_USER: 'user@example.com',
        MAIL_PASS: 'secret',
        MAIL_FROM: 'no-reply@example.com',
        // MAIL_SECURE غير محدد → false
        FRONTEND_URL: 'https://app.example.com/',
      };
      const service = new MailService(makeConfig(cfg));

      expect(createTransportMock).toHaveBeenCalledTimes(1);
      expect(createTransportMock).toHaveBeenCalledWith({
        host: cfg.MAIL_HOST,
        port: cfg.MAIL_PORT,
        secure: false,
        auth: { user: cfg.MAIL_USER, pass: cfg.MAIL_PASS },
        tls: { rejectUnauthorized: false },
      });

      // smoke test: استدعاء إرسال لا يرمي (سنختبره تفصيلاً لاحقًا)
      expect(service).toBeInstanceOf(MailService);
    });

    it('يرمي InternalServerErrorException عند نقص أي متغير مطلوب ويذكر الاسم المفقود', () => {
      const cfg = {
        MAIL_HOST: 'smtp.example.com',
        MAIL_PORT: 587,
        MAIL_USER: 'user@example.com',
        // MAIL_PASS مفقود
        MAIL_FROM: 'no-reply@example.com',
        FRONTEND_URL: 'https://app.example.com',
      };

      expect(() => new MailService(makeConfig(cfg))).toThrow(
        InternalServerErrorException,
      );

      let caughtError: any;
      try {
        new MailService(makeConfig(cfg));
      } catch (e: any) {
        caughtError = e;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toContain('Missing email configuration');
      expect(caughtError.message).toContain('MAIL_PASS');
      expect(createTransportMock).not.toHaveBeenCalled();
    });
  });

  describe('sendVerificationEmail', () => {
    const baseCfg = {
      MAIL_HOST: 'smtp.example.com',
      MAIL_PORT: 587,
      MAIL_USER: 'user@example.com',
      MAIL_PASS: 'secret',
      MAIL_FROM: 'no-reply@example.com',
      MAIL_SECURE: false,
      FRONTEND_URL: 'https://app.example.com///', // لاحق "/" ليتحقق trim
    };

    it('يرسل البريد بقيم from/to/subject صحيحة ويُضمّن الكود والرابط الصحيح في الـ HTML', async () => {
      const config = makeConfig(baseCfg);
      const service = new MailService(config);

      const email = faker.internet.email();
      const rawCode = 'ABC+123/=?'; // للتأكد من encodeURIComponent
      const expectedLink =
        'https://app.example.com/verify-email?code=' +
        encodeURIComponent(rawCode);

      sendMailMock.mockResolvedValueOnce({ accepted: [email] });

      await service.sendVerificationEmail(email, rawCode);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const arg = sendMailMock.mock.calls[0][0];

      expect(arg.from).toBe(`"MusaidBot" <${baseCfg.MAIL_FROM}>`);
      expect(arg.to).toBe(email);
      expect(arg.subject).toBe('تفعيل حسابك على منصة كليم');
      expect(typeof arg.html).toBe('string');
      expect(arg.html).toContain(rawCode);
      expect(arg.html).toContain(expectedLink);
    });

    it('يسجّل الخطأ ويرمي InternalServerErrorException عند فشل SMTP', async () => {
      const config = makeConfig(baseCfg);
      const service = new MailService(config);

      const email = faker.internet.email();
      const code = 'XYZ';

      sendMailMock.mockRejectedValueOnce(new Error('smtp failure'));
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await expect(service.sendVerificationEmail(email, code)).rejects.toThrow(
        new InternalServerErrorException('فشل في إرسال بريد التفعيل'),
      );

      expect(errorSpy).toHaveBeenCalled();
      // لا ضرر إن لم يتم تسجيل "نجاح" في هذا السيناريو
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('sent'));
    });
  });
});
