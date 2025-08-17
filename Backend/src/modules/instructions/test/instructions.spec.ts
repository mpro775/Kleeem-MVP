// src/modules/instructions/instructions.spec.ts
// اختبارات وحدة لـ InstructionsService + InstructionsController بدون أي I/O حقيقي
// Arrange–Act–Assert
import { faker } from '@faker-js/faker';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Types, Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { InstructionsService } from '../instructions.service';
import { InstructionsController } from '../instructions.controller';
import { Instruction, InstructionDocument } from '../schemas/instruction.schema';

// ===== Helpers =====
const oid = () => new Types.ObjectId().toHexString();

const makeFindChain = <T>(result: T) => {
  const chain: any = {
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

const makeFindActiveChain = <T>(result: T) => {
  const chain: any = {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

describe('InstructionsService', () => {
  let model: DeepMockProxy<Model<InstructionDocument>>;
  let service: InstructionsService;

  beforeEach(() => {
    model = mockDeep<Model<InstructionDocument>>();
    service = new InstructionsService(model as unknown as Model<InstructionDocument>);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ توجيهًا مع type الافتراضي auto و active=true عند عدم تمريرهما', async () => {
      const dto = {
        instruction: 'اعرض كود الخصم عند السؤال.',
        merchantId: oid(),
        relatedReplies: [oid(), oid()],
      };
      const created = { _id: oid(), ...dto, type: 'auto', active: true };
      model.create.mockResolvedValue(created as any);

      const res = await service.create(dto);

      expect(model.create).toHaveBeenCalledWith({
        ...dto,
        type: 'auto',
        active: true,
      });
      expect(res).toBe(created);
    });

    it('يحترم type الممرّر (manual)', async () => {
      const dto = { instruction: 'يدوي', type: 'manual' as const };
      const created = { _id: oid(), ...dto, active: true };
      model.create.mockResolvedValue(created as any);

      const res = await service.create(dto);

      expect(model.create).toHaveBeenCalledWith({
        ...dto,
        type: 'manual',
        active: true,
      });
      expect(res).toBe(created);
    });
  });

  describe('findAll', () => {
    it('يبني الفلتر بـ merchantId كـ ObjectId و active=true ويطبق limit/skip/sort/lean', async () => {
      const merchantId = oid();
      const result = [{ _id: oid() }, { _id: oid() }];

      // mock find chain
      (model.find as any).mockReturnValue(makeFindChain(result));

      const limit = 10;
      const page = 2;
      const res = await service.findAll({ merchantId, active: true, limit, page });

      // التحقق من الفلتر الممرّر
      expect(model.find).toHaveBeenCalledTimes(1);
      const passedFilter = (model.find as jest.Mock).mock.calls[0][0];
      expect(passedFilter.active).toBe(true);
      expect(passedFilter.merchantId).toBeInstanceOf(Types.ObjectId);
      expect(passedFilter.merchantId.toHexString()).toBe(merchantId);

      // limit/skip/sort/lean
      const chain = (model.find as any).mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(limit);
      expect(chain.skip).toHaveBeenCalledWith((page - 1) * limit);
      expect(chain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(chain.lean).toHaveBeenCalled();

      expect(res).toBe(result);
    });

    it('بدون merchantId/active: يمرر فلترًا فارغًا {}', async () => {
      const result: any[] = [];
      (model.find as any).mockReturnValue(makeFindChain(result));

      const res = await service.findAll({ limit: 5, page: 1 });

      expect(model.find).toHaveBeenCalledWith({});
      expect(res).toBe(result);
    });
  });

  describe('update/remove/activate/deactivate', () => {
    it('update: يستدعي findByIdAndUpdate مع {new:true}', async () => {
      const id = oid();
      const data: Partial<Instruction> = { instruction: 'محدّث', active: false };
      const updated = { _id: id, ...data };
      model.findByIdAndUpdate.mockResolvedValue(updated as any);

      const res = await service.update(id, data);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, data, { new: true });
      expect(res).toBe(updated);
    });

    it('remove: يستدعي findByIdAndDelete', async () => {
      const id = oid();
      const removed = { acknowledged: true };
      model.findByIdAndDelete.mockResolvedValue(removed as any);

      const res = await service.remove(id);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(res).toBe(removed);
    });

    it('deactivate: يعيّن active=false مع {new:true}', async () => {
      const id = oid();
      const doc = { _id: id, active: false };
      model.findByIdAndUpdate.mockResolvedValue(doc as any);

      const res = await service.deactivate(id);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, { active: false }, { new: true });
      expect(res).toBe(doc);
    });

    it('activate: يعيّن active=true مع {new:true}', async () => {
      const id = oid();
      const doc = { _id: id, active: true };
      model.findByIdAndUpdate.mockResolvedValue(doc as any);

      const res = await service.activate(id);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, { active: true }, { new: true });
      expect(res).toBe(doc);
    });
  });

  describe('getActiveInstructions', () => {
    it('يعيد التوجيهات النشطة فقط مع merchantId (ObjectId) وبترتيب updatedAt تنازليًا', async () => {
      const merchantId = oid();
      const list = [{ _id: oid(), active: true }];
      (model.find as any).mockReturnValue(makeFindActiveChain(list));

      const res = await service.getActiveInstructions(merchantId);

      expect(model.find).toHaveBeenCalledTimes(1);
      const filter = (model.find as jest.Mock).mock.calls[0][0];
      expect(filter.active).toBe(true);
      expect(filter.merchantId).toBeInstanceOf(Types.ObjectId);
      expect(filter.merchantId.toHexString()).toBe(merchantId);

      const chain = (model.find as any).mock.results[0].value;
      expect(chain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(chain.lean).toHaveBeenCalled();

      expect(res).toBe(list);
    });

    it('بدون merchantId: يستخدم فلتر {active:true} فقط', async () => {
      const list: any[] = [];
      (model.find as any).mockReturnValue(makeFindActiveChain(list));

      const res = await service.getActiveInstructions();

      expect(model.find).toHaveBeenCalledWith({ active: true });
      expect(res).toBe(list);
    });
  });
});

describe('InstructionsController', () => {
  let moduleRef: TestingModule;
  let controller: InstructionsController;
  let svc: DeepMockProxy<InstructionsService>;

  beforeEach(async () => {
    svc = mockDeep<InstructionsService>();

    moduleRef = await Test.createTestingModule({
      controllers: [InstructionsController],
      providers: [{ provide: InstructionsService, useValue: svc }],
    }).compile();

    controller = moduleRef.get(InstructionsController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  it('POST /instructions → يمرّر dto كما هو إلى الخدمة ويعيد الناتج', async () => {
    const dto = {
      instruction: 'إذا سُئلت عن الشحن فاذكر المدة.',
      merchantId: oid(),
      relatedReplies: [oid()],
      type: 'manual' as const,
    };
    const created = { _id: oid(), ...dto, active: true };
    svc.create.mockResolvedValue(created as any);

    const res = await controller.create(dto);

    expect(svc.create).toHaveBeenCalledWith(dto);
    expect(res).toBe(created);
  });

  it('GET /instructions → يحوّل active والصفحة والحدّ إلى الأنواع الصحيحة', async () => {
    const merchantId = oid();
    const list = [{ _id: oid() }];
    svc.findAll.mockResolvedValue(list as any);

    const res = await controller.findAll(merchantId, 'true', '50', '3');

    expect(svc.findAll).toHaveBeenCalledWith({
      merchantId,
      active: true,
      limit: 50,
      page: 3,
    });
    expect(res).toBe(list);
  });

  it('GET /instructions بدون فلاتر → يمرّر undefined/القيم الافتراضية', async () => {
    const list: any[] = [];
    svc.findAll.mockResolvedValue(list as any);

    const res = await controller.findAll(undefined, undefined, undefined as any, undefined as any);

    expect(svc.findAll).toHaveBeenCalledWith({
      merchantId: undefined,
      active: undefined,
      limit: 30,
      page: 1,
    });
    expect(res).toBe(list);
  });

  it('PATCH /instructions/:id → يستدعي update بالقيم الصحيحة', async () => {
    const id = oid();
    const dto = { instruction: 'تعديل', active: false, relatedReplies: [oid()] };
    const updated = { _id: id, ...dto };
    svc.update.mockResolvedValue(updated as any);

    const res = await controller.update(id, dto);

    expect(svc.update).toHaveBeenCalledWith(id, dto);
    expect(res).toBe(updated);
  });

  it('DELETE /instructions/:id → يستدعي remove', async () => {
    const id = oid();
    const out = { acknowledged: true };
    svc.remove.mockResolvedValue(out as any);

    const res = await controller.remove(id);

    expect(svc.remove).toHaveBeenCalledWith(id);
    expect(res).toBe(out);
  });

  it('PATCH /instructions/:id/deactivate → يستدعي deactivate', async () => {
    const id = oid();
    const out = { _id: id, active: false };
    svc.deactivate.mockResolvedValue(out as any);

    const res = await controller.deactivate(id);

    expect(svc.deactivate).toHaveBeenCalledWith(id);
    expect(res).toBe(out);
  });

  it('PATCH /instructions/:id/activate → يستدعي activate', async () => {
    const id = oid();
    const out = { _id: id, active: true };
    svc.activate.mockResolvedValue(out as any);

    const res = await controller.activate(id);

    expect(svc.activate).toHaveBeenCalledWith(id);
    expect(res).toBe(out);
  });

  it('GET /instructions/active → يستدعي getActiveInstructions مع merchantId (اختياري)', async () => {
    const merchantId = oid();
    const list = [{ _id: oid(), active: true }];
    svc.getActiveInstructions.mockResolvedValue(list as any);

    const res = await controller.getActive(merchantId);

    expect(svc.getActiveInstructions).toHaveBeenCalledWith(merchantId);
    expect(res).toBe(list);
  });
});
