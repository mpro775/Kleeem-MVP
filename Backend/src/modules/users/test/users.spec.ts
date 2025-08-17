// src/modules/users/test/users.spec.ts
// اختبارات شاملة لوحدة Users: Controller + Service
// تغطي إدارة المستخدمين، المصادقة، والأذونات
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock للموديلات
const mockUserModel = mockDeep<Model<any>>();

describe('UsersService', () => {
  let service: UsersService;

  const mockUserId = new Types.ObjectId().toHexString();
  const mockMerchantId = new Types.ObjectId().toHexString();

  const mockUser = {
    _id: mockUserId,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$hashedPassword',
    firstName: 'أحمد',
    lastName: 'محمد',
    phone: '+966501234567',
    role: 'MEMBER',
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: false,
    merchantId: mockMerchantId,
    profile: {
      avatar: 'https://example.com/avatar.jpg',
      bio: 'مطور تطبيقات',
      preferences: {
        language: 'ar',
        timezone: 'Asia/Riyadh',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        theme: 'light',
      },
      socialLinks: {
        twitter: 'https://twitter.com/testuser',
        linkedin: 'https://linkedin.com/in/testuser',
      },
    },
    permissions: ['read:products', 'write:orders', 'admin:users'],
    loginHistory: [
      {
        timestamp: new Date('2023-01-01T12:00:00.000Z'),
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
      },
    ],
    lastLoginAt: new Date('2023-01-01T12:00:00.000Z'),
    lastActiveAt: new Date('2023-01-01T12:00:00.000Z'),
    passwordChangedAt: new Date('2023-01-01T10:00:00.000Z'),
    emailVerificationToken: null,
    phoneVerificationCode: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    createdAt: new Date('2023-01-01T10:00:00.000Z'),
    updatedAt: new Date('2023-01-01T12:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken('User'), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'سالم',
      lastName: 'أحمد',
      phone: '+966509876543',
      role: 'MEMBER',
      merchantId: mockMerchantId,
    };

    it('ينشئ مستخدم جديد بنجاح', async () => {
      const hashedPassword = '$2b$10$hashedNewPassword';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockUserModel.create.mockResolvedValue({
        ...mockUser,
        ...createUserDto,
        password: hashedPassword,
      } as any);

      const result = await service.create(createUserDto as any);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
      });
      expect(result.password).toBeUndefined(); // يجب ألا يظهر كلمة المرور
    });

    it('يرمي ConflictException عند وجود email مكرر', async () => {
      const duplicateError = { code: 11000, keyPattern: { email: 1 } };
      mockUserModel.create.mockRejectedValue(duplicateError);

      await expect(service.create(createUserDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('يرمي ConflictException عند وجود username مكرر', async () => {
      const duplicateError = { code: 11000, keyPattern: { username: 1 } };
      mockUserModel.create.mockRejectedValue(duplicateError);

      await expect(service.create(createUserDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('ينشئ مستخدم بدور ADMIN', async () => {
      const adminDto = { ...createUserDto, role: 'ADMIN' };
      const hashedPassword = '$2b$10$hashedAdminPassword';

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockUserModel.create.mockResolvedValue({
        ...mockUser,
        ...adminDto,
        password: hashedPassword,
      } as any);

      const result = await service.create(adminDto as any);

      expect(result.role).toBe('ADMIN');
    });
  });

  describe('findAll', () => {
    it('يسترجع جميع المستخدمين مع pagination', async () => {
      const mockUsers = [mockUser, { ...mockUser, _id: 'user2' }];
      const sortMock = jest.fn().mockReturnThis();
      const skipMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockUsers);

      mockUserModel.countDocuments.mockResolvedValue(2);
      (mockUserModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        skip: skipMock,
        limit: limitMock,
        select: selectMock,
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockUserModel.find).toHaveBeenCalledWith({});
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(selectMock).toHaveBeenCalledWith('-password');
      expect(result).toEqual({
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('يطبق فلاتر البحث بشكل صحيح', async () => {
      const filters = {
        merchantId: mockMerchantId,
        role: 'MEMBER',
        isActive: true,
        search: 'أحمد',
      };

      const sortMock = jest.fn().mockReturnThis();
      const skipMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue([mockUser]);

      mockUserModel.countDocuments.mockResolvedValue(1);
      (mockUserModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        skip: skipMock,
        limit: limitMock,
        select: selectMock,
        populate: populateMock,
        exec: execMock,
      });

      await service.findAll({ ...filters, page: 1, limit: 10 });

      expect(mockUserModel.find).toHaveBeenCalledWith({
        merchantId: filters.merchantId,
        role: filters.role,
        isActive: filters.isActive,
        $or: [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { username: { $regex: filters.search, $options: 'i' } },
        ],
      });
    });
  });

  describe('findOne', () => {
    it('يسترجع مستخدم محدد بنجاح', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockUser);

      (mockUserModel.findById as jest.Mock).mockReturnValue({
        select: selectMock,
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findOne(mockUserId);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(selectMock).toHaveBeenCalledWith('-password');
      expect(populateMock).toHaveBeenCalledWith('merchantId');
      expect(result).toEqual(mockUser);
    });

    it('يرمي NotFoundException عند عدم وجود المستخدم', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      (mockUserModel.findById as jest.Mock).mockReturnValue({
        select: selectMock,
        populate: populateMock,
        exec: execMock,
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('يجد المستخدم بالبريد الإلكتروني', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockUser);

      (mockUserModel.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
        exec: execMock,
      });

      const result = await service.findByEmail('test@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(selectMock).toHaveBeenCalledWith('-password');
      expect(result).toEqual(mockUser);
    });

    it('يعيد null عند عدم وجود المستخدم', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      (mockUserModel.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
        exec: execMock,
      });

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('يجد المستخدم باسم المستخدم', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockUser);

      (mockUserModel.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
        exec: execMock,
      });

      const result = await service.findByUsername('testuser');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        username: 'testuser',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    const updateData = {
      firstName: 'محمد',
      lastName: 'علي',
      phone: '+966512345678',
      profile: {
        bio: 'مطور محدث',
        preferences: {
          language: 'en',
          theme: 'dark',
        },
      },
    };

    it('يحدث المستخدم بنجاح', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser as any);

      const result = await service.update(mockUserId, updateData);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        updateData,
        { new: true, runValidators: true, select: '-password' },
      );
      expect(result).toEqual(updatedUser);
    });

    it('يرمي NotFoundException عند عدم وجود المستخدم للتحديث', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', updateData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    it('يحدث كلمة المرور بنجاح', async () => {
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';
      const hashedNewPassword = '$2b$10$hashedNewPassword';

      const userWithPassword = { ...mockUser, password: '$2b$10$hashedOld' };
      mockUserModel.findById.mockResolvedValue(userWithPassword as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue(hashedNewPassword as never);
      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithPassword,
        password: hashedNewPassword,
      } as any);

      const result = await service.updatePassword(
        mockUserId,
        oldPassword,
        newPassword,
      );

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        oldPassword,
        userWithPassword.password,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        {
          password: hashedNewPassword,
          passwordChangedAt: expect.any(Date),
        },
        { new: true, select: '-password' },
      );
      expect(result).toBeDefined();
    });

    it('يرمي UnauthorizedException عند كلمة مرور خاطئة', async () => {
      const userWithPassword = { ...mockUser, password: '$2b$10$hashedOld' };
      mockUserModel.findById.mockResolvedValue(userWithPassword as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.updatePassword(mockUserId, 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('remove', () => {
    it('يحذف المستخدم بنجاح (soft delete)', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        ...mockUser,
        isActive: false,
        deletedAt: new Date(),
      } as any);

      const result = await service.remove(mockUserId);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        {
          isActive: false,
          deletedAt: expect.any(Date),
        },
        { new: true, select: '-password' },
      );
      expect(result.deleted).toBe(true);
    });

    it('يرمي NotFoundException عند عدم وجود المستخدم للحذف', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    it('يحدث دور المستخدم بنجاح', async () => {
      const updatedUser = { ...mockUser, role: 'ADMIN' };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser as any);

      const result = await service.updateRole(mockUserId, 'ADMIN');

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { role: 'ADMIN' },
        { new: true, select: '-password' },
      );
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('updatePermissions', () => {
    it('يحدث أذونات المستخدم', async () => {
      const newPermissions = ['read:all', 'write:all', 'admin:all'];
      const updatedUser = { ...mockUser, permissions: newPermissions };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser as any);

      const result = await service.updatePermissions(
        mockUserId,
        newPermissions,
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { permissions: newPermissions },
        { new: true, select: '-password' },
      );
      expect(result.permissions).toEqual(newPermissions);
    });
  });

  describe('verifyEmail', () => {
    it('يؤكد البريد الإلكتروني بنجاح', async () => {
      const token = 'verification-token';
      const userWithToken = { ...mockUser, emailVerificationToken: token };
      mockUserModel.findOne.mockResolvedValue(userWithToken as any);
      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithToken,
        isEmailVerified: true,
        emailVerificationToken: null,
      } as any);

      const result = await service.verifyEmail(token);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        emailVerificationToken: token,
      });
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        {
          isEmailVerified: true,
          emailVerificationToken: null,
        },
        { new: true, select: '-password' },
      );
      expect(result.verified).toBe(true);
    });

    it('يرمي BadRequestException للرمز غير الصحيح', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserStats', () => {
    it('يعيد إحصائيات المستخدمين', async () => {
      const stats = {
        totalUsers: 100,
        activeUsers: 85,
        inactiveUsers: 15,
        verifiedUsers: 90,
        adminUsers: 5,
        memberUsers: 95,
        recentUsers: [mockUser],
      };

      mockUserModel.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85) // active
        .mockResolvedValueOnce(15) // inactive
        .mockResolvedValueOnce(90) // verified
        .mockResolvedValueOnce(5) // admin
        .mockResolvedValueOnce(95); // member

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(stats.recentUsers);

      (mockUserModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        limit: limitMock,
        select: selectMock,
        exec: execMock,
      });

      const result = await service.getUserStats(mockMerchantId);

      expect(result).toEqual(stats);
    });
  });

  describe('updateLastActivity', () => {
    it('يحدث آخر نشاط للمستخدم', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      await service.updateLastActivity(mockUserId);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { lastActiveAt: expect.any(Date) },
      );
    });
  });

  describe('addLoginHistory', () => {
    it('يضيف سجل تسجيل دخول جديد', async () => {
      const loginData = {
        ip: '192.168.1.2',
        userAgent: 'Chrome/91.0',
        success: true,
      };

      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      await service.addLoginHistory(mockUserId, loginData);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        {
          $push: {
            loginHistory: {
              ...loginData,
              timestamp: expect.any(Date),
            },
          },
          lastLoginAt: expect.any(Date),
        },
      );
    });
  });
});

describe('UsersController', () => {
  let controller: UsersController;
  let service: DeepMockProxy<UsersService>;
  let moduleRef: TestingModule;

  const mockUserResponse = {
    _id: 'user-123',
    username: 'apiuser',
    email: 'apiuser@example.com',
    firstName: 'مستخدم',
    lastName: 'API',
    role: 'MEMBER',
    isActive: true,
    createdAt: new Date('2023-01-01T12:00:00.000Z'),
  };

  beforeEach(async () => {
    service = mockDeep<UsersService>();

    moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = moduleRef.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ مستخدم جديد عبر API', async () => {
      const createDto = {
        username: 'newapi',
        email: 'newapi@example.com',
        password: 'password123',
        firstName: 'جديد',
        lastName: 'API',
        role: 'MEMBER',
      };

      service.create.mockResolvedValue(mockUserResponse as any);

      const result = await controller.create(createDto as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('findAll', () => {
    it('يسترجع المستخدمين مع فلاتر', async () => {
      const query = {
        page: '1',
        limit: '10',
        merchantId: 'merchant-123',
        role: 'MEMBER',
        search: 'مستخدم',
      };

      const usersResponse = {
        data: [mockUserResponse],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      service.findAll.mockResolvedValue(usersResponse as any);

      const result = await controller.findAll(
        query.page,
        query.limit,
        query.merchantId,
        query.role,
        undefined, // isActive
        query.search,
        undefined, // sortBy
        undefined, // sortOrder
      );

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        merchantId: query.merchantId,
        role: query.role,
        search: query.search,
      });
      expect(result).toEqual(usersResponse);
    });
  });

  describe('findOne', () => {
    it('يسترجع مستخدم محدد', async () => {
      const userId = 'user-123';

      service.findOne.mockResolvedValue(mockUserResponse as any);

      const result = await controller.findOne(userId);

      expect(service.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('update', () => {
    it('يحدث المستخدم بنجاح', async () => {
      const userId = 'user-123';
      const updateDto = {
        firstName: 'محدث',
        lastName: 'جديد',
        phone: '+966512345678',
      };

      const updatedUser = { ...mockUserResponse, ...updateDto };
      service.update.mockResolvedValue(updatedUser as any);

      const result = await controller.update(userId, updateDto as any);

      expect(service.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('يحذف المستخدم بنجاح', async () => {
      const userId = 'user-123';
      const deleteResult = {
        deleted: true,
        user: mockUserResponse,
      };

      service.remove.mockResolvedValue(deleteResult as any);

      const result = await controller.remove(userId);

      expect(service.remove).toHaveBeenCalledWith(userId);
      expect(result).toEqual(deleteResult);
    });
  });

  describe('updatePassword', () => {
    it('يحدث كلمة المرور بنجاح', async () => {
      const userId = 'user-123';
      const passwordDto = {
        oldPassword: 'oldPass123',
        newPassword: 'newPass456',
      };

      const updatedUser = mockUserResponse;
      service.updatePassword.mockResolvedValue(updatedUser as any);

      const result = await controller.updatePassword(
        userId,
        passwordDto as any,
      );

      expect(service.updatePassword).toHaveBeenCalledWith(
        userId,
        passwordDto.oldPassword,
        passwordDto.newPassword,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('updateRole', () => {
    it('يحدث دور المستخدم', async () => {
      const userId = 'user-123';
      const roleDto = { role: 'ADMIN' };

      const updatedUser = { ...mockUserResponse, role: 'ADMIN' };
      service.updateRole.mockResolvedValue(updatedUser as any);

      const result = await controller.updateRole(userId, roleDto as any);

      expect(service.updateRole).toHaveBeenCalledWith(userId, 'ADMIN');
      expect(result).toEqual(updatedUser);
    });
  });

  describe('updatePermissions', () => {
    it('يحدث أذونات المستخدم', async () => {
      const userId = 'user-123';
      const permissionsDto = {
        permissions: ['read:all', 'write:products'],
      };

      const updatedUser = {
        ...mockUserResponse,
        permissions: permissionsDto.permissions,
      };
      service.updatePermissions.mockResolvedValue(updatedUser as any);

      const result = await controller.updatePermissions(
        userId,
        permissionsDto as any,
      );

      expect(service.updatePermissions).toHaveBeenCalledWith(
        userId,
        permissionsDto.permissions,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('verifyEmail', () => {
    it('يؤكد البريد الإلكتروني', async () => {
      const token = 'verification-token';
      const verificationResult = {
        verified: true,
        user: mockUserResponse,
      };

      service.verifyEmail.mockResolvedValue(verificationResult as any);

      const result = await controller.verifyEmail(token);

      expect(service.verifyEmail).toHaveBeenCalledWith(token);
      expect(result).toEqual(verificationResult);
    });
  });

  describe('getUserStats', () => {
    it('يعيد إحصائيات المستخدمين', async () => {
      const merchantId = 'merchant-123';
      const stats = {
        totalUsers: 50,
        activeUsers: 45,
        inactiveUsers: 5,
        verifiedUsers: 40,
        adminUsers: 2,
        memberUsers: 48,
      };

      service.getUserStats.mockResolvedValue(stats as any);

      const result = await controller.getUserStats(merchantId);

      expect(service.getUserStats).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(stats);
    });
  });

  describe('Integration Tests', () => {
    it('يختبر تدفق كامل: إنشاء → استرجاع → تحديث → تحديث الدور → حذف', async () => {
      const createDto = {
        username: 'integration',
        email: 'integration@example.com',
        password: 'pass123',
        firstName: 'تكامل',
        lastName: 'اختبار',
      };
      const userId = 'integration-user';

      // 1. إنشاء مستخدم
      const createdUser = { _id: userId, ...createDto };
      service.create.mockResolvedValue(createdUser as any);
      const createResult = await controller.create(createDto as any);
      expect(createResult).toEqual(createdUser);

      // 2. استرجاع المستخدم
      service.findOne.mockResolvedValue(createdUser as any);
      const findResult = await controller.findOne(userId);
      expect(findResult).toEqual(createdUser);

      // 3. تحديث البيانات
      const updateDto = { firstName: 'محدث' };
      const updatedUser = { ...createdUser, ...updateDto };
      service.update.mockResolvedValue(updatedUser as any);
      const updateResult = await controller.update(userId, updateDto as any);
      expect(updateResult).toEqual(updatedUser);

      // 4. تحديث الدور
      const roleDto = { role: 'ADMIN' };
      const userWithNewRole = { ...updatedUser, role: 'ADMIN' };
      service.updateRole.mockResolvedValue(userWithNewRole as any);
      const roleResult = await controller.updateRole(userId, roleDto as any);
      expect(roleResult).toEqual(userWithNewRole);

      // 5. حذف المستخدم
      const deleteResult = { deleted: true, user: userWithNewRole };
      service.remove.mockResolvedValue(deleteResult as any);
      const removeResult = await controller.remove(userId);
      expect(removeResult).toEqual(deleteResult);

      // التحقق من الاستدعاءات
      expect(service.create).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalled();
      expect(service.update).toHaveBeenCalled();
      expect(service.updateRole).toHaveBeenCalled();
      expect(service.remove).toHaveBeenCalled();
    });

    it('يختبر سيناريو تحديث كلمة المرور والتحقق من البريد', async () => {
      const userId = 'password-user';

      // 1. تحديث كلمة المرور
      const passwordDto = {
        oldPassword: 'oldPass123',
        newPassword: 'newSecurePass456',
      };

      const updatedUser = { _id: userId, username: 'testuser' };
      service.updatePassword.mockResolvedValue(updatedUser as any);

      const passwordResult = await controller.updatePassword(
        userId,
        passwordDto as any,
      );
      expect(passwordResult).toEqual(updatedUser);

      // 2. التحقق من البريد الإلكتروني
      const verificationToken = 'email-token-123';
      const verificationResult = {
        verified: true,
        user: { ...updatedUser, isEmailVerified: true },
      };

      service.verifyEmail.mockResolvedValue(verificationResult as any);

      const emailResult = await controller.verifyEmail(verificationToken);
      expect(emailResult).toEqual(verificationResult);

      // التحقق من ترتيب العمليات
      expect(service.updatePassword).toHaveBeenCalledBefore(
        service.verifyEmail,
      );
    });
  });
});
