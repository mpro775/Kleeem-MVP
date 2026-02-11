import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { AdminSystemController } from '../admin-system.controller';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminSystemService } from '../services/admin-system.service';
import { FeatureFlagsService } from '../services/feature-flags.service';

describe('AdminSystemController', () => {
  let controller: AdminSystemController;
  let auditService: jest.Mocked<AdminAuditService>;
  let systemService: jest.Mocked<AdminSystemService>;
  let featureFlags: jest.Mocked<FeatureFlagsService>;

  const mockAuditService = {
    list: jest.fn(),
  };

  const mockSystemService = {
    listAdminSessions: jest.fn(),
    revokeSessionByJti: jest.fn(),
    triggerBackup: jest.fn(),
  };

  const mockFeatureFlags = {
    getFlags: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AdminSystemController],
      providers: [
        { provide: AdminAuditService, useValue: mockAuditService },
        { provide: AdminSystemService, useValue: mockSystemService },
        { provide: FeatureFlagsService, useValue: mockFeatureFlags },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminSystemController>(AdminSystemController);
    auditService = module.get(AdminAuditService);
    systemService = module.get(AdminSystemService);
    featureFlags = module.get(FeatureFlagsService);
  });

  describe('GET admin/system/audit-log', () => {
    it('should return audit log from service', async () => {
      const mock = { items: [], total: 0 };
      mockAuditService.list.mockResolvedValue(mock);

      const result = await controller.getAuditLog({} as any);

      expect(auditService.list).toHaveBeenCalled();
      expect(result).toEqual(mock);
    });
  });

  describe('GET admin/system/sessions', () => {
    it('should return admin sessions from service', async () => {
      const mock = { sessions: [] };
      mockSystemService.listAdminSessions.mockResolvedValue(mock);

      const result = await controller.getAdminSessions();

      expect(systemService.listAdminSessions).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mock);
    });

    it('should filter by adminId when provided', async () => {
      mockSystemService.listAdminSessions.mockResolvedValue({ sessions: [] });

      await controller.getAdminSessions('admin-123');

      expect(systemService.listAdminSessions).toHaveBeenCalledWith('admin-123');
    });
  });

  describe('DELETE admin/system/sessions/:jti', () => {
    it('should revoke session when found', async () => {
      mockSystemService.revokeSessionByJti.mockResolvedValue(true);

      const result = await controller.revokeSession('jti-xyz');

      expect(systemService.revokeSessionByJti).toHaveBeenCalledWith('jti-xyz');
      expect(result).toEqual({ message: 'تم إلغاء الجلسة' });
    });

    it('should throw NotFound when session not found', async () => {
      mockSystemService.revokeSessionByJti.mockResolvedValue(false);

      await expect(controller.revokeSession('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('GET admin/system/feature-flags', () => {
    it('should return feature flags from service', () => {
      const mock = { merchantSignupEnabled: true, userSignupEnabled: true };
      mockFeatureFlags.getFlags.mockReturnValue(mock);

      const result = controller.getFeatureFlags();

      expect(featureFlags.getFlags).toHaveBeenCalled();
      expect(result).toEqual(mock);
    });
  });

  describe('POST admin/system/backup', () => {
    it('should return success when backup triggered', async () => {
      mockSystemService.triggerBackup.mockResolvedValue({
        success: true,
        message: 'تم استدعاء النسخ الاحتياطي',
      });

      const result = await controller.triggerBackup({ userId: 'admin-1' } as any);

      expect(systemService.triggerBackup).toHaveBeenCalledWith('admin-1');
      expect(result).toEqual({ message: 'تم استدعاء النسخ الاحتياطي' });
    });

    it('should throw ServiceUnavailable when backup fails', async () => {
      mockSystemService.triggerBackup.mockResolvedValue({
        success: false,
        message: 'غير مُفعّل',
      });

      await expect(
        controller.triggerBackup({ userId: 'admin-1' } as any),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
