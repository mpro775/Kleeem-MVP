// src/modules/leads/leads.spec.ts
// يغطي LeadsService (create, findAllForMerchant) و LeadsController (createLead, getLeads)
// Arrange–Act–Assert بدون أي I/O حقيقي.
import { faker } from '@faker-js/faker';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { LeadsService } from '../leads.service';
import { LeadsController } from '../leads.controller';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto } from '../dto/create-lead.dto';

describe('LeadsService', () => {
  let model: DeepMockProxy<Model<LeadDocument>>;
  let service: LeadsService;

  beforeEach(() => {
    model = mockDeep<Model<LeadDocument>>();
    service = new LeadsService(model as unknown as Model<LeadDocument>);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ Lead ويُعيد toObject الناتج (happy path)', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const dto: CreateLeadDto = {
        sessionId: `session_${faker.string.alphanumeric(10)}`,
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
        },
        source: 'website',
      };

      const plain: Lead = {
        merchantId,
        sessionId: dto.sessionId,
        data: dto.data,
        source: dto.source,
      };
      const createdDoc: any = { toObject: () => plain };

      model.create.mockResolvedValue(createdDoc);

      const res = await service.create(merchantId, dto);

      expect(model.create).toHaveBeenCalledWith({
        merchantId,
        sessionId: dto.sessionId,
        data: dto.data,
        source: dto.source,
      });
      expect(res).toEqual(plain);
    });

    it('يدعم source اختياريًا (بدون تحديد)', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const dto: CreateLeadDto = {
        sessionId: `session_${faker.string.alphanumeric(10)}`,
        data: { message: 'hello' },
        // source غير موجود
      } as any;

      const plain: Lead = {
        merchantId,
        sessionId: dto.sessionId,
        data: dto.data,
        source: undefined,
      };
      const createdDoc: any = { toObject: () => plain };
      model.create.mockResolvedValue(createdDoc);

      const res = await service.create(merchantId, dto);

      expect(model.create).toHaveBeenCalledWith({
        merchantId,
        sessionId: dto.sessionId,
        data: dto.data,
        source: dto.source, // undefined
      });
      expect(res).toEqual(plain);
    });
  });

  describe('findAllForMerchant', () => {
    it('يبحث بالـ merchantId ويرتّب createdAt تنازليًا ويعيد lean()', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const rows: Lead[] = [
        {
          merchantId,
          sessionId: 's1',
          data: { name: 'A' },
          source: 'website',
        },
      ];

      const chain = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(rows),
      };
      // @ts-expect-error: chainable mock
      model.find.mockReturnValue(chain);

      const res = await service.findAllForMerchant(merchantId);

      expect(model.find).toHaveBeenCalledWith({ merchantId });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.lean).toHaveBeenCalled();
      expect(res).toBe(rows);
    });
  });
});

describe('LeadsController', () => {
  let moduleRef: TestingModule;
  let controller: LeadsController;
  let svc: DeepMockProxy<LeadsService>;

  beforeEach(async () => {
    svc = mockDeep<LeadsService>();

    moduleRef = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [{ provide: LeadsService, useValue: svc }],
    }).compile();

    controller = moduleRef.get(LeadsController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  it('POST /:merchantId/leads → يمرر merchantId و dto إلى LeadsService.create', async () => {
    const merchantId = `m_${faker.string.numeric(6)}`;
    const dto: CreateLeadDto = {
      sessionId: `session_${faker.string.alphanumeric(8)}`,
      data: { note: 'interested' },
      source: 'chatbot',
    };

    const out: Lead = {
      merchantId,
      sessionId: dto.sessionId,
      data: dto.data,
      source: dto.source,
    };
    svc.create.mockResolvedValue(out as any);

    const res = await controller.createLead(merchantId, dto);

    expect(svc.create).toHaveBeenCalledWith(merchantId, dto);
    expect(res).toBe(out);
  });

  it('GET /:merchantId/leads → يستدعي LeadsService.findAllForMerchant ويعيد النتيجة', async () => {
    const merchantId = `m_${faker.string.numeric(6)}`;
    const list: Lead[] = [
      { merchantId, sessionId: 's1', data: { name: 'A' }, source: 'form' },
    ];
    svc.findAllForMerchant.mockResolvedValue(list as any);

    const res = await controller.getLeads(merchantId);

    expect(svc.findAllForMerchant).toHaveBeenCalledWith(merchantId);
    expect(res).toBe(list);
  });
});
