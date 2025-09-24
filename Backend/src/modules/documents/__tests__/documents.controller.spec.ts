// src/modules/documents/__tests__/documents.controller.spec.ts
// يغطي DocumentsController: تفويض الاستدعاءات للخدمة والتعامل مع Response.redirect
// Arrange–Act–Assert

import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';

import { DocumentsController } from '../documents.controller';
import { DocumentsService } from '../documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const svc = {
    uploadFile: jest.fn(),
    list: jest.fn(),
    getPresignedUrl: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: svc }],
    }).compile();
    controller = moduleRef.get(DocumentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /:merchantId/documents → upload() يستدعي الخدمة بالقيم الصحيحة', async () => {
    const merchantId = 'm_123';
    const file: any = {
      originalname: 'a.pdf',
      mimetype: 'application/pdf',
      path: '/tmp/x',
    };
    const returned = { _id: 'd1' };
    svc.uploadFile.mockResolvedValue(returned);

    const res = await controller.upload({ merchantId }, file);

    expect(svc.uploadFile).toHaveBeenCalledWith(merchantId, file);
    expect(res).toBe(returned);
  });

  test('GET /:merchantId/documents → list()', async () => {
    const merchantId = faker.string.uuid();
    const items = [{ _id: 'd1' }];
    svc.list.mockResolvedValue(items);

    const res = await controller.list({ merchantId });
    expect(svc.list).toHaveBeenCalledWith(merchantId);
    expect(res).toBe(items);
  });

  test('GET /:merchantId/documents/:docId → download() يعيد توجيه المتصفح', async () => {
    const merchantId = 'm1';
    const docId = 'd1';
    const url = 'https://minio/presigned';
    svc.getPresignedUrl.mockResolvedValue(url);
    const redirect = jest.fn();
    const res: any = { redirect };

    await controller.download({ merchantId }, { docId }, res);

    expect(svc.getPresignedUrl).toHaveBeenCalledWith(merchantId, docId);
    expect(redirect).toHaveBeenCalledWith(url);
  });

  test('DELETE /:merchantId/documents/:docId → remove()', async () => {
    const merchantId = 'm1';
    const docId = 'd1';
    svc.delete.mockResolvedValue(undefined);

    const res = await controller.remove({ merchantId }, { docId });

    expect(svc.delete).toHaveBeenCalledWith(merchantId, docId);
    expect(res).toBeUndefined();
  });
});
