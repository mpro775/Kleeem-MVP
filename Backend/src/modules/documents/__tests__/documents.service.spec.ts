import { getQueueToken } from '@nestjs/bull';
import { Test } from '@nestjs/testing';

import { DocumentsService } from '../documents.service';
import { S3_CLIENT_TOKEN } from '../../../common/storage/s3-client.provider';

import type { DocumentsRepository } from '../repositories/documents.repository';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  __esModule: true,
  getSignedUrl: jest.fn().mockResolvedValue('https://s3/presigned'),
}));

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repo: jest.Mocked<DocumentsRepository>;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findByIdForMerchant: jest.fn(),
      listByMerchant: jest.fn(),
      deleteByIdForMerchant: jest.fn(),
    } as any;

    queue = { add: jest.fn() };
    const s3Mock = { send: jest.fn().mockResolvedValue({}) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: 'DocumentsRepository', useValue: repo },
        {
          provide: getQueueToken('documents-processing-queue'),
          useValue: queue,
        },
        { provide: S3_CLIENT_TOKEN, useValue: s3Mock },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    (service as any).s3 = s3Mock;
  });

  it('uploadFile: يرفع إلى التخزين، ينشئ مستند، ويدفع مهمة للـ Queue', async () => {
    const file = {
      originalname: 'file.pdf',
      mimetype: 'application/pdf',
      path: '/tmp/f.pdf',
    } as any;

    repo.create.mockResolvedValue({
      _id: 'doc1',
      toObject: () => ({ _id: 'doc1', storageKey: 'k', filename: 'file.pdf' }),
    } as any);

    const res = await service.uploadFile('m1', file);

    expect((service as any).s3.send).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'm1',
        filename: 'file.pdf',
        fileType: 'application/pdf',
        status: 'pending',
      }),
    );
    expect(queue.add).toHaveBeenCalledWith('process', {
      docId: 'doc1',
      merchantId: 'm1',
    });
    expect((res as any)._id).toBe('doc1');
  });

  it('list: يرجع قائمة المستندات من الريبو', async () => {
    repo.listByMerchant.mockResolvedValue([{ _id: 'a' } as any]);
    const out = await service.list('m1');
    expect(out).toEqual([{ _id: 'a' }]);
  });

  it('getPresignedUrl: يرجع رابط موقّع', async () => {
    repo.findByIdForMerchant.mockResolvedValue({
      storageKey: 'k',
    } as any);

    const url = await service.getPresignedUrl('m1', 'd1');
    expect(url).toBe('https://s3/presigned');
  });

  it('delete: يحذف من التخزين ثم من الريبو', async () => {
    repo.findByIdForMerchant.mockResolvedValue({
      storageKey: 'k',
    } as any);

    await service.delete('m1', 'd1');

    expect((service as any).s3.send).toHaveBeenCalled();
    expect(repo.deleteByIdForMerchant).toHaveBeenCalledWith('d1', 'm1');
  });
});
