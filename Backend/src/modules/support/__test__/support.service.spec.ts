import { HttpService } from '@nestjs/axios';
import { Test, type TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';

import { SupportService } from '../support.service';
import { SUPPORT_REPOSITORY } from '../tokens';

import type { SupportRepository } from '../repositories/support.repository';

describe('SupportService', () => {
  let service: SupportService;

  const repo: jest.Mocked<SupportRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
  } as unknown as jest.Mocked<SupportRepository>;

  const httpMock = {
    post: jest.fn(),
  } as unknown as jest.Mocked<HttpService>;

  const minioMock = {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn(),
    putObject: jest.fn().mockResolvedValue(undefined),
    fPutObject: jest.fn().mockResolvedValue(undefined),
    presignedGetObject: jest
      .fn()
      .mockResolvedValue('https://cdn.example.com/bucket/key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.MINIO_BUCKET = 'test-bucket';
    process.env.ASSETS_CDN_BASE_URL = 'https://cdn.example.com';
    process.env.RECAPTCHA_SECRET = 'secret';

    // reCAPTCHA success by default
    (httpMock.post as any).mockImplementation((url: string) => {
      if (url.includes('recaptcha')) return of({ data: { success: true } });
      return of({ data: { ok: true } });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: SUPPORT_REPOSITORY, useValue: repo },
        { provide: HttpService, useValue: httpMock },
        { provide: 'MINIO_CLIENT', useValue: minioMock },
      ],
    }).compile();

    service = module.get(SupportService);
  });

  it('should create ticket, upload files, and notify', async () => {
    repo.create.mockResolvedValue({
      _id: 't1' as any,
      ticketNumber: 'KT-XXX-123',
      name: 'John',
      email: 'j@e.com',
      phone: '0555',
      topic: 'general',
      subject: 'Hello',
      message: 'Message',
      status: 'open',
    } as any);

    const file: any = {
      originalname: 'image.png',
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('x'),
    };

    const out = await service.create(
      {
        name: 'John',
        email: 'j@e.com',
        message: 'Message',
        recaptchaToken: 'tok',
      } as any,
      [file],
      { source: 'landing', ip: '1.1.1.1', userAgent: 'ua' },
    );

    expect(minioMock.putObject).toHaveBeenCalled();
    expect(repo.create.bind(repo)).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.any(Array),
        status: 'open',
        source: 'landing',
      }),
    );
    expect(out._id).toBe('t1');
  });

  it('should reject spam via honeypot', async () => {
    await expect(
      service.create({
        name: 'A',
        email: 'a@a.a',
        message: 'm',
        website: 'bot',
        recaptchaToken: 't',
      } as any),
    ).rejects.toThrow('Spam detected');
  });

  it('should fail when recaptcha fails', async () => {
    (httpMock.post as any).mockImplementationOnce(() =>
      of({ data: { success: false } }),
    );
    await expect(
      service.create({
        name: 'A',
        email: 'a@a.a',
        message: 'm',
        recaptchaToken: 'bad',
      } as any),
    ).rejects.toThrow('reCAPTCHA failed');
  });

  it('notifyChannels should send to configured endpoints', async () => {
    process.env.SUPPORT_SLACK_WEBHOOK_URL = 'https://slack';
    process.env.SUPPORT_TELEGRAM_BOT_TOKEN = 'bot';
    process.env.SUPPORT_TELEGRAM_CHAT_ID = 'chat';
    process.env.SUPPORT_N8N_WEBHOOK_URL = 'https://n8n';

    (httpMock.post as any).mockReturnValue(of({ data: { ok: true } }));

    await service.notifyChannels({
      _id: '1' as any,
      ticketNumber: 'KT-1',
      name: 'N',
      email: 'e',
      phone: '',
      topic: 'support',
      subject: 's',
      message: 'm',
      status: 'open',
      createdAt: new Date(),
    });

    expect((httpMock.post as any).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
