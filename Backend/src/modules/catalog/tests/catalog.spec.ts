// src/catalog/__tests__/catalog.spec.ts
// اختبارات وحدة لـ CatalogService و CatalogController.
// تغطي فروع productSource (zid/salla/internal) وحالة NotFound،
// وتتحقق من تمرير المعرفات والقيم الصحيحة واستدعاءات الخدمات التابعة.
// Arrange – Act – Assert

import 'reflect-metadata';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CatalogService } from '../catalog.service';
import { CatalogController } from '../catalog.controller';

describe('CatalogService (unit)', () => {
  let service: CatalogService;

  const merchantModelMock: any = {
    findById: jest.fn(),
  };

  const zidMock = {
    fetchZidProducts: jest.fn(),
  };

  const sallaMock = {
    fetchSallaProducts: jest.fn(),
  };

  const productsMock = {
    upsertExternalProduct: jest.fn(),
  };

  const leanResult = (val: any) => ({ lean: jest.fn().mockResolvedValue(val) });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CatalogService(
      merchantModelMock,
      zidMock as any,
      sallaMock as any,
      productsMock as any,
    );
  });

  it('يرمي NotFound عند عدم وجود التاجر', async () => {
    // Arrange
    const merchantId = new Types.ObjectId().toHexString();
    merchantModelMock.findById.mockReturnValue(leanResult(null));

    // Act + Assert
    await expect(service.syncForMerchant(merchantId)).rejects.toBeInstanceOf(NotFoundException);
    expect(merchantModelMock.findById).toHaveBeenCalledWith(merchantId);
  });

  it('zid: يجلب المنتجات ويُدخل/يحدّث ويحسِب imported/updated بشكل صحيح', async () => {
    // Arrange
    const merchantId = new Types.ObjectId().toHexString();
    merchantModelMock.findById.mockReturnValue(
      leanResult({ _id: new Types.ObjectId(merchantId), productSource: 'zid' }),
    );

    const zidList = [{ id: 1 }, { id: 2 }, { id: 3 }];
    zidMock.fetchZidProducts.mockResolvedValue(zidList);

    // upsert: created=true, false, true => imported=2, updated=1
    productsMock.upsertExternalProduct
      .mockResolvedValueOnce({ created: true })
      .mockResolvedValueOnce({ created: false })
      .mockResolvedValueOnce({ created: true });

    // Act
    const out = await service.syncForMerchant(merchantId);

    // Assert
    expect(zidMock.fetchZidProducts).toHaveBeenCalledTimes(1);
    const passedObjId = zidMock.fetchZidProducts.mock.calls[0][0];
    expect(passedObjId).toBeInstanceOf(Types.ObjectId);
    expect(String(passedObjId)).toBe(merchantId);

    expect(productsMock.upsertExternalProduct).toHaveBeenCalledTimes(3);
    expect(productsMock.upsertExternalProduct).toHaveBeenNthCalledWith(1, merchantId, 'zid', zidList[0]);
    expect(productsMock.upsertExternalProduct).toHaveBeenNthCalledWith(2, merchantId, 'zid', zidList[1]);
    expect(productsMock.upsertExternalProduct).toHaveBeenNthCalledWith(3, merchantId, 'zid', zidList[2]);

    expect(out).toEqual({ imported: 2, updated: 1 });
  });

  it('salla: يجلب المنتجات ويحسب imported/updated', async () => {
    // Arrange
    const merchantId = new Types.ObjectId().toHexString();
    merchantModelMock.findById.mockReturnValue(
      leanResult({ _id: new Types.ObjectId(merchantId), productSource: 'salla' }),
    );

    const sallaList = [{ id: 'a' }, { id: 'b' }];
    sallaMock.fetchSallaProducts.mockResolvedValue(sallaList);

    productsMock.upsertExternalProduct
      .mockResolvedValueOnce({ created: false })
      .mockResolvedValueOnce({ created: true });

    // Act
    const out = await service.syncForMerchant(merchantId);

    // Assert
    expect(sallaMock.fetchSallaProducts).toHaveBeenCalledTimes(1);
    const passedObjId = sallaMock.fetchSallaProducts.mock.calls[0][0];
    expect(passedObjId).toBeInstanceOf(Types.ObjectId);
    expect(String(passedObjId)).toBe(merchantId);

    expect(productsMock.upsertExternalProduct).toHaveBeenCalledTimes(2);
    expect(productsMock.upsertExternalProduct).toHaveBeenNthCalledWith(1, merchantId, 'salla', sallaList[0]);
    expect(productsMock.upsertExternalProduct).toHaveBeenNthCalledWith(2, merchantId, 'salla', sallaList[1]);

    expect(out).toEqual({ imported: 1, updated: 1 });
  });

  it('internal: لا يجلب شيئًا ويعيد imported=0, updated=0', async () => {
    // Arrange
    const merchantId = new Types.ObjectId().toHexString();
    merchantModelMock.findById.mockReturnValue(
      leanResult({ _id: new Types.ObjectId(merchantId), productSource: 'internal' }),
    );

    // Act
    const out = await service.syncForMerchant(merchantId);

    // Assert
    expect(zidMock.fetchZidProducts).not.toHaveBeenCalled();
    expect(sallaMock.fetchSallaProducts).not.toHaveBeenCalled();
    expect(productsMock.upsertExternalProduct).not.toHaveBeenCalled();
    expect(out).toEqual({ imported: 0, updated: 0 });
  });
});

describe('CatalogController (unit)', () => {
  let controller: CatalogController;
  const serviceMock = {
    syncForMerchant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get(CatalogController);
  });

  it('ينادي الخدمة بالقيمة الصحيحة ويعيد الناتج كما هو', async () => {
    // Arrange
    const merchantId = new Types.ObjectId().toHexString();
    const expected = { imported: 5, updated: 7 };
    serviceMock.syncForMerchant.mockResolvedValue(expected);

    // Act
    const out = await controller.sync(merchantId);

    // Assert
    expect(serviceMock.syncForMerchant).toHaveBeenCalledWith(merchantId);
    expect(out).toEqual(expected);
  });
});
