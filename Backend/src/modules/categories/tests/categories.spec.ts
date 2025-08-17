// src/modules/categories/__tests__/categories.spec.ts
// اختبارات وحدة لـ CategoriesService و CategoriesController بدون أي I/O حقيقي.
// تغطي: create/findAllFlat/findAllTree/findOne/update/remove + اختبارات الكنترولر.
// Arrange – Act – Assert

import 'reflect-metadata';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';

import { CategoriesService } from '../categories.service';
import { CategoriesController } from '../categories.controller';

describe('CategoriesService (unit)', () => {
  let service: CategoriesService;

  // سننشئ موك يعمل كـ Model constructor + static methods
  let categoryModelMock: any;

  const resetModel = () => {
    categoryModelMock = jest.fn(); // constructor: new this.categoryModel(...)
    categoryModelMock.find = jest.fn();
    categoryModelMock.findById = jest.fn();
    categoryModelMock.findByIdAndUpdate = jest.fn();
    categoryModelMock.findByIdAndDelete = jest.fn();
  };

  const leanRes = (value: any) => ({ lean: jest.fn().mockResolvedValue(value) });

  beforeEach(() => {
    jest.clearAllMocks();
    resetModel();
    service = new CategoriesService(categoryModelMock);
  });

  describe('create', () => {
    it('ينشئ فئة جديدة ويحوّل merchantId إلى ObjectId ثم يحفظها', async () => {
      // Arrange
      const merchantIdStr = new Types.ObjectId().toHexString();
      const dto = {
        name: 'ملابس',
        merchantId: merchantIdStr,
        description: 'قسم الملابس',
        image: 'https://example.com/x.png',
        keywords: ['رجالي'],
      };

      let ctorPayload: any;
      const savedId = new Types.ObjectId();
      (categoryModelMock as jest.Mock).mockImplementation((payload) => {
        ctorPayload = payload;
        return {
          save: jest.fn().mockResolvedValue({ _id: savedId, ...payload }),
        };
      });

      // Act
      const out = await service.create(dto as any);

      // Assert
      expect(categoryModelMock).toHaveBeenCalledTimes(1);
      expect(ctorPayload.name).toBe(dto.name);
      expect(ctorPayload.merchantId).toBeInstanceOf(Types.ObjectId);
      expect(String(ctorPayload.merchantId)).toBe(merchantIdStr);
      expect(out).toEqual({ _id: savedId, ...ctorPayload });
    });
  });

  describe('findAllFlat', () => {
    it('يعيد قائمة الفئات كما هي (lean)', async () => {
      // Arrange
      const list = [
        { _id: new Types.ObjectId(), name: 'Root A' },
        { _id: new Types.ObjectId(), name: 'Root B' },
      ];
      categoryModelMock.find.mockReturnValue(leanRes(list));

      // Act
      const out = await service.findAllFlat();

      // Assert
      expect(categoryModelMock.find).toHaveBeenCalled();
      expect(out).toBe(list);
    });
  });

  describe('findAllTree', () => {
    it('يبني شجرة الفئات وفق parent/_id', async () => {
      // Arrange
      const idRoot = new Types.ObjectId();
      const idChild1 = new Types.ObjectId();
      const idChild2 = new Types.ObjectId();
      const idSub = new Types.ObjectId();
      const flat = [
        { _id: idRoot, name: 'Root', parent: null },
        { _id: idChild1, name: 'Child 1', parent: idRoot },
        { _id: idChild2, name: 'Child 2', parent: idRoot },
        { _id: idSub, name: 'Sub of Child1', parent: idChild1 },
      ];
      categoryModelMock.find.mockReturnValue(leanRes(flat));

      // Act
      const tree = await service.findAllTree();

      // Assert
      expect(Array.isArray(tree)).toBe(true);
      expect(tree).toHaveLength(1);
      const root = tree[0];
      expect(String(root._id)).toBe(String(idRoot));
      expect(root.children).toHaveLength(2);

      const child1 = root.children.find((c: any) => String(c._id) === String(idChild1));
      const child2 = root.children.find((c: any) => String(c._id) === String(idChild2));
      expect(child1.children).toHaveLength(1);
      expect(String(child1.children[0]._id)).toBe(String(idSub));
      expect(child2.children).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('يعيد الوثيقة عندما توجد', async () => {
      // Arrange
      const id = new Types.ObjectId().toHexString();
      const doc = { _id: id, name: 'X' };
      categoryModelMock.findById.mockResolvedValue(doc);

      // Act
      const out = await service.findOne(id);

      // Assert
      expect(categoryModelMock.findById).toHaveBeenCalledWith(id);
      expect(out).toBe(doc);
    });

    it('يرمي NotFound عند عدم وجود الفئة', async () => {
      // Arrange
      const id = new Types.ObjectId().toHexString();
      categoryModelMock.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('يحدّث ويعيد الوثيقة الجديدة', async () => {
      // Arrange
      const id = new Types.ObjectId().toHexString();
      const dto = { name: 'مُحدّثة' };
      const updated = { _id: id, name: 'مُحدّثة' };
      categoryModelMock.findByIdAndUpdate.mockResolvedValue(updated);

      // Act
      const out = await service.update(id, dto as any);

      // Assert
      expect(categoryModelMock.findByIdAndUpdate).toHaveBeenCalledWith(id, dto, { new: true });
      expect(out).toBe(updated);
    });

    it('يرمي NotFound إذا لم تُحدّث (null)', async () => {
      const id = new Types.ObjectId().toHexString();
      categoryModelMock.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.update(id, {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('يحذف ويعيد رسالة نجاح', async () => {
      // Arrange
      const id = new Types.ObjectId().toHexString();
      const deleted = { _id: id, name: 'Old' };
      categoryModelMock.findByIdAndDelete.mockResolvedValue(deleted);

      // Act
      const out = await service.remove(id);

      // Assert
      expect(categoryModelMock.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(out).toEqual({ message: 'Category deleted successfully' });
    });

    it('يرمي NotFound إذا لم توجد الوثيقة للحذف', async () => {
      const id = new Types.ObjectId().toHexString();
      categoryModelMock.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove(id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('CategoriesController (unit)', () => {
  let controller: CategoriesController;
  const serviceMock = {
    create: jest.fn(),
    findAllFlat: jest.fn(),
    findAllTree: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: serviceMock }],
    }).compile();

    controller = module.get(CategoriesController);
  });

  it('create: يستدعي الخدمة ويعيد الناتج', async () => {
    const dto = { name: 'أقسام', merchantId: new Types.ObjectId().toHexString() };
    const created = { _id: new Types.ObjectId(), ...dto };
    serviceMock.create.mockResolvedValue(created);

    const out = await controller.create(dto as any);

    expect(serviceMock.create).toHaveBeenCalledWith(dto);
    expect(out).toBe(created);
  });

  it('findAll(tree=true): يستدعي findAllTree', async () => {
    const tree = [{ name: 'Root', children: [] }];
    serviceMock.findAllTree.mockResolvedValue(tree);

    const out = await controller.findAll('true');

    expect(serviceMock.findAllTree).toHaveBeenCalled();
    expect(out).toBe(tree);
  });

  it('findAll(): يستدعي findAllFlat عند عدم تمرير tree', async () => {
    const flat = [{ name: 'A' }, { name: 'B' }];
    serviceMock.findAllFlat.mockResolvedValue(flat);

    const out = await controller.findAll(undefined);

    expect(serviceMock.findAllFlat).toHaveBeenCalled();
    expect(out).toBe(flat);
  });

  it('findOne: يمرر id الصحيح ويعيد الناتج', async () => {
    const id = new Types.ObjectId().toHexString();
    const doc = { _id: id, name: 'X' };
    serviceMock.findOne.mockResolvedValue(doc);

    const out = await controller.findOne(id);

    expect(serviceMock.findOne).toHaveBeenCalledWith(id);
    expect(out).toBe(doc);
  });

  it('update: يمرر id و dto الصحيحين', async () => {
    const id = new Types.ObjectId().toHexString();
    const dto = { name: 'Y' };
    const updated = { _id: id, name: 'Y' };
    serviceMock.update.mockResolvedValue(updated);

    const out = await controller.update(id, dto as any);

    expect(serviceMock.update).toHaveBeenCalledWith(id, dto);
    expect(out).toBe(updated);
  });

  it('remove: يمرر id ويعيد الرسالة', async () => {
    const id = new Types.ObjectId().toHexString();
    const msg = { message: 'Category deleted successfully' };
    serviceMock.remove.mockResolvedValue(msg);

    const out = await controller.remove(id);

    expect(serviceMock.remove).toHaveBeenCalledWith(id);
    expect(out).toBe(msg);
  });
});
