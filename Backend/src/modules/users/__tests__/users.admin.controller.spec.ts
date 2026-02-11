import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Types } from 'mongoose';

import { AuthService } from '../../auth/auth.service';
import { UsersAdminController } from '../users.admin.controller';
import { UsersService } from '../users.service';
import { QueryAdminUsersDto } from '../dto/query-admin-users.dto';
import { UpdateUserAdminDto } from '../dto/update-user-admin.dto';
import { UserRole } from '../schemas/user.schema';

describe('UsersAdminController', () => {
  let controller: UsersAdminController;
  let service: jest.Mocked<UsersService>;

  const mockUserLean = {
    _id: new Types.ObjectId().toString(),
    email: 'admin@example.com',
    name: 'أدمن',
    role: UserRole.ADMIN,
    active: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserDoc = {
    _id: new Types.ObjectId(),
    email: mockUserLean.email,
    name: mockUserLean.name,
    role: UserRole.ADMIN,
    active: true,
  } as any;

  const mockStats = {
    total: 50,
    activeCount: 45,
    inactiveCount: 5,
    byRole: { [UserRole.ADMIN]: 2, [UserRole.MERCHANT]: 30, [UserRole.MEMBER]: 18 },
  };

  const mockService = {
    listAllAdmin: jest.fn(),
    getStatsAdmin: jest.fn(),
    findOne: jest.fn(),
    updateAdmin: jest.fn(),
  };

  const mockAuthService = {
    adminResetPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [UsersAdminController],
      providers: [
        { provide: UsersService, useValue: mockService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersAdminController>(UsersAdminController);
    service = module.get(UsersService);
  });

  describe('GET admin/users (list)', () => {
    it('should return paginated users with default query', async () => {
      const query = new QueryAdminUsersDto();
      query.limit = 30;
      query.page = 1;
      const expected = { items: [mockUserLean], total: 1 };
      mockService.listAllAdmin.mockResolvedValue(expected);

      const result = await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30, page: 1 }),
      );
      expect(result).toEqual(expected);
    });

    it('should pass role, active, includeDeleted filters', async () => {
      const query = new QueryAdminUsersDto();
      query.role = UserRole.MERCHANT;
      query.active = true;
      query.includeDeleted = true;
      query.limit = 20;
      query.page = 2;
      mockService.listAllAdmin.mockResolvedValue({ items: [], total: 0 });

      await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith({
        limit: 20,
        page: 2,
        role: UserRole.MERCHANT,
        active: true,
        includeDeleted: true,
      });
    });
  });

  describe('GET admin/users/stats', () => {
    it('should return stats from service', async () => {
      mockService.getStatsAdmin.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStatsAdmin).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
    });
  });

  describe('GET admin/users/:id (getOne)', () => {
    it('should return user when found', async () => {
      mockService.findOne.mockResolvedValue(mockUserLean);

      const result = await controller.getOne(mockUserLean._id);

      expect(service.findOne).toHaveBeenCalledWith(mockUserLean._id);
      expect(result).toEqual(mockUserLean);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(controller.getOne('invalid-id')).rejects.toThrow(
        'معرف المستخدم غير صالح',
      );
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('should throw when user not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.getOne('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH admin/users/:id', () => {
    it('should update and return user', async () => {
      const dto: UpdateUserAdminDto = {
        active: false,
        role: UserRole.MEMBER,
      };
      const mockUser = { userId: 'admin-id' };
      mockService.updateAdmin.mockResolvedValue({
        ...mockUserDoc,
        ...dto,
      });

      const result = await controller.update(mockUserLean._id, dto, mockUser);

      expect(service.updateAdmin).toHaveBeenCalledWith(
        mockUserLean._id,
        dto,
        mockUser,
      );
      expect(result.active).toBe(false);
      expect(result.role).toBe(UserRole.MEMBER);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(
        controller.update('invalid', { active: true }, { userId: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(service.updateAdmin).not.toHaveBeenCalled();
    });
  });

  describe('POST admin/users/:id/reset-password', () => {
    it('should return temporary password', async () => {
      mockAuthService.adminResetPassword.mockResolvedValue({
        temporaryPassword: 'temp123abc',
      });

      const result = await controller.resetPassword(mockUserLean._id);

      expect(mockAuthService.adminResetPassword).toHaveBeenCalledWith(
        mockUserLean._id,
      );
      expect(result.temporaryPassword).toBe('temp123abc');
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(controller.resetPassword('invalid')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAuthService.adminResetPassword).not.toHaveBeenCalled();
    });
  });
});
