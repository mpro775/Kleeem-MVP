import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from '../knowledge.service';
import { SOURCE_URL_REPOSITORY } from '../tokens';
import { VectorService } from '../../vector/vector.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { OutboxService } from '../../../common/outbox/outbox.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

const repoMock = {
  createMany: jest.fn(),
  markCompleted: jest.fn(),
  markFailed: jest.fn(),
  findByMerchant: jest.fn(),
  findListByMerchant: jest.fn(),
  findByIdForMerchant: jest.fn(),
  findByUrlForMerchant: jest.fn(),
  deleteByIdForMerchant: jest.fn(),
  deleteByMerchant: jest.fn(),
};

const vectorMock = {
  embed: jest.fn(),
  upsertWebKnowledge: jest.fn(),
  deleteWebKnowledgeByFilter: jest.fn(),
  generateWebKnowledgeId: jest
    .fn()
    .mockImplementation((m: string, s: string) => `${m}:${s}`),
};

const notificationsMock = { notifyUser: jest.fn() };
const outboxMock = { enqueueEvent: jest.fn().mockResolvedValue(undefined) };

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: SOURCE_URL_REPOSITORY, useValue: repoMock },
        { provide: VectorService, useValue: vectorMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: OutboxService, useValue: outboxMock },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);

    // منع عمل المتصفح في الاختبارات
    jest
      .spyOn<any, any>(service as any, 'extractTextFromUrl')
      .mockResolvedValue({ text: 'نص عربي للاختبار test content' });
    jest
      .spyOn<any, any>(service as any, 'processUrlsInBackground')
      .mockResolvedValue({ success: true });
  });

  it('should queue unique urls and notify', async () => {
    const merchantId = 'm-1';
    const urls = [' https://a.com ', 'https://a.com', 'https://b.com'];
    repoMock.createMany.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        url: 'https://a.com',
        merchantId,
        status: 'pending',
      },
      {
        _id: new Types.ObjectId(),
        url: 'https://b.com',
        merchantId,
        status: 'pending',
      },
    ]);

    const res = await service.addUrls(merchantId, urls, 'user-1');

    expect(repoMock.createMany).toHaveBeenCalledTimes(1);
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
    expect(notificationsMock.notifyUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        type: 'knowledge.urls.queued',
      }),
    );
  });

  it('getUrlsStatus should aggregate counts', async () => {
    repoMock.findByMerchant.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        url: 'u1',
        status: 'pending',
        textExtracted: '',
      },
      {
        _id: new Types.ObjectId(),
        url: 'u2',
        status: 'completed',
        textExtracted: 'xxx',
      },
      {
        _id: new Types.ObjectId(),
        url: 'u3',
        status: 'failed',
        errorMessage: 'err',
      },
    ]);
    const out = await service.getUrlsStatus('m-1');

    expect(out.total).toBe(3);
    expect(out.pending).toBe(1);
    expect(out.completed).toBe(1);
    expect(out.failed).toBe(1);
  });

  it('deleteById should validate id', async () => {
    await expect(service.deleteById('m', 'bad-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deleteById should throw if not found', async () => {
    const id = String(new Types.ObjectId());
    repoMock.findByIdForMerchant.mockResolvedValue(null);
    await expect(service.deleteById('m-1', id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deleteByUrl should throw if not found', async () => {
    repoMock.findByUrlForMerchant.mockResolvedValue(null);
    await expect(
      service.deleteByUrl('m-1', 'https://x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
