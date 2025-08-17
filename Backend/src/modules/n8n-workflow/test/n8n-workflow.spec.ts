// src/modules/n8n-workflow/test/n8n-workflow.spec.ts
// اختبارات شاملة لوحدة N8N Workflow: Controller + Service
// تغطي إنشاء، تحديث، استنساخ، وإدارة workflows
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import axios, { AxiosInstance } from 'axios';

import { N8nWorkflowController } from '../n8n-workflow.controller';
import {
  N8nWorkflowService,
  WorkflowDefinition,
} from '../n8n-workflow.service';
import { WorkflowHistoryService } from '../../workflow-history/workflow-history.service';
import { MerchantsService } from '../../merchants/merchants.service';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { RollbackDto } from '../dto/rollback.dto';
import { SetActiveDto } from '../dto/set-active.dto';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock template JSON
jest.mock('../workflow-template.json', () => ({
  name: 'Template Workflow',
  nodes: [
    {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [100, 200],
      parameters: { path: 'test-path' },
    },
    {
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [300, 200],
      parameters: { url: 'https://api.test.com' },
    },
  ],
  connections: {},
  active: false,
  settings: {},
  pinData: {},
}));

describe('N8nWorkflowService', () => {
  let service: N8nWorkflowService;
  let historyService: DeepMockProxy<WorkflowHistoryService>;
  let merchantsService: DeepMockProxy<MerchantsService>;
  let mockAxiosInstance: DeepMockProxy<AxiosInstance>;

  const merchantId = '507f1f77bcf86cd799439011';
  const workflowId = 'wf_123456789';

  beforeEach(async () => {
    historyService = mockDeep<WorkflowHistoryService>();
    merchantsService = mockDeep<MerchantsService>();
    mockAxiosInstance = mockDeep<AxiosInstance>();

    // Mock axios.create to return our mocked instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        N8nWorkflowService,
        { provide: WorkflowHistoryService, useValue: historyService },
        { provide: MerchantsService, useValue: merchantsService },
      ],
    }).compile();

    service = module.get<N8nWorkflowService>(N8nWorkflowService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('ينشئ axios instance بالإعدادات الصحيحة', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://n8n.kaleem-ai.com/api/v1',
        headers: {
          'X-N8N-API-KEY': expect.any(String),
        },
        timeout: 5000,
      });
    });
  });

  describe('createForMerchant', () => {
    it('ينشئ workflow جديد بنجاح ويحفظ في التاريخ', async () => {
      const workflowResponse = { data: { id: workflowId } };
      mockAxiosInstance.post.mockResolvedValueOnce(workflowResponse);
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} }); // activate call
      merchantsService.update.mockResolvedValue({} as any);
      historyService.create.mockResolvedValue({} as any);

      const result = await service.createForMerchant(merchantId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/workflows',
        expect.objectContaining({
          name: `wf-${merchantId}`,
          nodes: expect.arrayContaining([
            expect.objectContaining({
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              parameters: expect.objectContaining({
                path: `ai-agent-${merchantId}`,
              }),
            }),
          ]),
        }),
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/workflows/${workflowId}/activate`,
      );

      expect(merchantsService.update).toHaveBeenCalledWith(merchantId, {
        workflowId,
      });

      expect(historyService.create).toHaveBeenCalledWith({
        merchantId,
        workflowId,
        version: 1,
        workflowJson: expect.any(Object),
        updatedBy: 'system',
        isRollback: false,
      });

      expect(result).toBe(workflowId);
    });

    it('يستمر حتى لو فشل التفعيل', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { id: workflowId },
      });
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Activation failed'),
      );
      merchantsService.update.mockResolvedValue({} as any);
      historyService.create.mockResolvedValue({} as any);

      const result = await service.createForMerchant(merchantId);

      expect(result).toBe(workflowId);
      expect(merchantsService.update).toHaveBeenCalled();
      expect(historyService.create).toHaveBeenCalled();
    });

    it('يرمي خطأ عند فشل إنشاء الـ workflow', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid workflow data' },
        },
        message: 'Request failed',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(service.createForMerchant(merchantId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('get', () => {
    it('يجلب workflow بنجاح', async () => {
      const workflowData: WorkflowDefinition = {
        id: workflowId,
        name: `wf-${merchantId}`,
        nodes: [],
        connections: {},
        active: true,
        settings: {},
        pinData: {},
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: workflowData });

      const result = await service.get(workflowId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/workflows/${workflowId}`,
      );
      expect(result).toEqual(workflowData);
    });

    it('يرمي خطأ عند عدم وجود الـ workflow', async () => {
      const error = {
        response: { status: 404, data: { message: 'Workflow not found' } },
        message: 'Not found',
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(service.get(workflowId)).rejects.toThrow(HttpException);
    });
  });

  describe('update', () => {
    it('يحدث workflow ويحفظ النسخة الجديدة في التاريخ', async () => {
      const currentWorkflow: WorkflowDefinition = {
        id: workflowId,
        name: `wf-${merchantId}`,
        nodes: [],
        connections: {},
        active: true,
        settings: {},
        pinData: {},
      };

      const historyRecords = [{ version: 2 }];
      const updateFn = jest.fn().mockReturnValue({
        ...currentWorkflow,
        name: 'Updated Workflow',
      });

      mockAxiosInstance.get.mockResolvedValueOnce({ data: currentWorkflow });
      historyService.findAllByWorkflow.mockResolvedValue(historyRecords as any);
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: {} });
      historyService.create.mockResolvedValue({} as any);

      await service.update(workflowId, updateFn, 'admin');

      expect(updateFn).toHaveBeenCalledWith(currentWorkflow);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/workflows/${workflowId}`,
        expect.objectContaining({ name: 'Updated Workflow' }),
      );
      expect(historyService.create).toHaveBeenCalledWith({
        merchantId,
        workflowId,
        version: 3, // 2 + 1
        workflowJson: expect.any(Object),
        updatedBy: 'admin',
        isRollback: false,
      });
    });

    it('يستخدم version 1 عند عدم وجود تاريخ سابق', async () => {
      const currentWorkflow: WorkflowDefinition = {
        id: workflowId,
        name: `wf-${merchantId}`,
        nodes: [],
        connections: {},
        active: true,
        settings: {},
        pinData: {},
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: currentWorkflow });
      historyService.findAllByWorkflow.mockResolvedValue([]);
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: {} });
      historyService.create.mockResolvedValue({} as any);

      const updateFn = jest.fn().mockReturnValue(currentWorkflow);
      await service.update(workflowId, updateFn, 'admin');

      expect(historyService.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1 }),
      );
    });
  });

  describe('rollback', () => {
    it('يسترجع نسخة قديمة بنجاح', async () => {
      const historyRecord = {
        merchantId,
        workflowId,
        version: 2,
        workflowJson: { name: 'Old Version' },
      };

      historyService.findVersion.mockResolvedValue(historyRecord as any);
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: {} });
      historyService.create.mockResolvedValue({} as any);

      await service.rollback(workflowId, 2, 'admin');

      expect(historyService.findVersion).toHaveBeenCalledWith(workflowId, 2);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/workflows/${workflowId}`,
        historyRecord.workflowJson,
      );
      expect(historyService.create).toHaveBeenCalledWith({
        merchantId,
        workflowId,
        version: 3, // 2 + 1
        workflowJson: historyRecord.workflowJson,
        updatedBy: 'admin',
        isRollback: true,
      });
    });

    it('يرمي خطأ عند عدم وجود النسخة المطلوبة', async () => {
      historyService.findVersion.mockResolvedValue(null);

      await expect(service.rollback(workflowId, 99, 'admin')).rejects.toThrow(
        'Requested version not found',
      );
    });
  });

  describe('cloneToMerchant', () => {
    it('ينسخ workflow لتاجر جديد بنجاح', async () => {
      const sourceWorkflow: WorkflowDefinition = {
        id: 'source_wf_123',
        name: 'wf-source-merchant',
        nodes: [
          {
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [100, 200],
            parameters: { path: 'old-path' },
          },
        ],
        connections: {},
        active: true,
        settings: {},
        pinData: {},
      };

      const newWorkflowId = 'new_wf_456';
      const targetMerchantId = '507f1f77bcf86cd799439022';

      mockAxiosInstance.get.mockResolvedValueOnce({ data: sourceWorkflow });
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { id: newWorkflowId },
      });
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} }); // activate
      merchantsService.update.mockResolvedValue({} as any);
      historyService.create.mockResolvedValue({} as any);

      const result = await service.cloneToMerchant(
        'source_wf_123',
        targetMerchantId,
        'admin',
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/workflows',
        expect.objectContaining({
          name: `wf-${targetMerchantId}`,
          nodes: expect.arrayContaining([
            expect.objectContaining({
              parameters: expect.objectContaining({
                path: `ai-agent-${targetMerchantId}`,
              }),
            }),
          ]),
        }),
      );

      expect(merchantsService.update).toHaveBeenCalledWith(targetMerchantId, {
        workflowId: newWorkflowId,
      });

      expect(result).toBe(newWorkflowId);
    });
  });

  describe('setActive', () => {
    it('يفعل workflow بنجاح', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });

      await service.setActive(workflowId, true);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/workflows/${workflowId}/activate`,
      );
    });

    it('يعطل workflow بنجاح', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });

      await service.setActive(workflowId, false);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/workflows/${workflowId}/deactivate`,
      );
    });

    it('يرمي خطأ عند فشل التفعيل', async () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } },
        message: 'Internal error',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(service.setActive(workflowId, true)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('sanitizeTemplate (اختبار غير مباشر)', () => {
    it('يزيل الحقول غير المدعومة من القالب', async () => {
      const dirtyTemplate = {
        id: 'should-be-removed',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-id-should-be-removed',
            name: 'Test Node',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [100, 200],
            parameters: { path: 'test' },
            webhookId: 'should-be-removed',
          },
        ],
        connections: {},
        active: true, // should be removed
        pinData: {}, // should be removed
        versionId: 'should-be-removed',
      };

      // نحاكي القالب المتسخ
      jest.doMock('../workflow-template.json', () => dirtyTemplate);

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { id: workflowId },
      });
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });
      merchantsService.update.mockResolvedValue({} as any);
      historyService.create.mockResolvedValue({} as any);

      await service.createForMerchant(merchantId);

      // نتحقق أن POST تم استدعاؤه بدون الحقول المحظورة
      const postCall = mockAxiosInstance.post.mock.calls.find(
        (call) => call[0] === '/workflows',
      );
      expect(postCall).toBeDefined();

      const payload = postCall![1] as Record<string, any>;
      expect(payload).not.toHaveProperty('id');
      expect(payload).not.toHaveProperty('active');
      expect(payload).not.toHaveProperty('pinData');
      expect(payload).not.toHaveProperty('versionId');
      expect(payload.nodes[0]).not.toHaveProperty('id');
      expect(payload.nodes[0]).not.toHaveProperty('webhookId');
    });
  });

  describe('wrapError', () => {
    it('يلف أخطاء axios بـ HttpException', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Bad request from n8n' },
        },
        message: 'Request failed with status code 400',
      };

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(service.get('invalid-id')).rejects.toThrow(
        new HttpException(
          'n8n API GET failed: Bad request from n8n',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('يتعامل مع أخطاء بدون response', async () => {
      const networkError = new Error('Network timeout');
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);

      await expect(service.get('test-id')).rejects.toThrow(
        new HttpException(
          'n8n API GET failed: Network timeout',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});

describe('N8nWorkflowController', () => {
  let controller: N8nWorkflowController;
  let service: DeepMockProxy<N8nWorkflowService>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    service = mockDeep<N8nWorkflowService>();

    moduleRef = await Test.createTestingModule({
      controllers: [N8nWorkflowController],
      providers: [{ provide: N8nWorkflowService, useValue: service }],
    }).compile();

    controller = moduleRef.get<N8nWorkflowController>(N8nWorkflowController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  describe('createForMerchant', () => {
    it('ينشئ workflow جديد ويعيد workflowId', async () => {
      const merchantId = '507f1f77bcf86cd799439011';
      const workflowId = 'wf_123456789';

      service.createForMerchant.mockResolvedValue(workflowId);

      const result = await controller.createForMerchant(merchantId);

      expect(service.createForMerchant).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual({ workflowId });
    });

    it('يمرر الخطأ من Service إلى Controller', async () => {
      const merchantId = '507f1f77bcf86cd799439011';
      const error = new HttpException('Service error', HttpStatus.BAD_REQUEST);

      service.createForMerchant.mockRejectedValue(error);

      await expect(controller.createForMerchant(merchantId)).rejects.toThrow(
        error,
      );
    });
  });

  describe('get', () => {
    it('يجلب workflow بنجاح', async () => {
      const workflowId = 'wf_123456789';
      const workflowData: WorkflowDefinition = {
        id: workflowId,
        name: 'Test Workflow',
        nodes: [],
        connections: {},
        active: true,
        settings: {},
        pinData: {},
      };

      service.get.mockResolvedValue(workflowData);

      const result = await controller.get(workflowId);

      expect(service.get).toHaveBeenCalledWith(workflowId);
      expect(result).toEqual(workflowData);
    });
  });

  describe('update', () => {
    it('يحدث workflow بنجاح', async () => {
      const workflowId = 'wf_123456789';
      const updateDto: UpdateWorkflowDto = {
        jsonPatch: { name: 'Updated Workflow', active: true },
        reason: 'Test update',
      };

      service.update.mockResolvedValue(undefined);

      const result = await controller.update(workflowId, updateDto);

      expect(service.update).toHaveBeenCalledWith(
        workflowId,
        expect.any(Function),
        'admin',
      );

      // نختبر دالة التحديث
      const updateFn = service.update.mock.calls[0][1];
      const originalJson = { name: 'Original', active: false };
      const updatedJson = updateFn(originalJson as WorkflowDefinition);

      expect(updatedJson).toEqual({
        name: 'Updated Workflow',
        active: true,
      });

      expect(result).toEqual({
        message: 'Workflow updated and history recorded',
      });
    });
  });

  describe('rollback', () => {
    it('يسترجع نسخة قديمة بنجاح', async () => {
      const workflowId = 'wf_123456789';
      const rollbackDto: RollbackDto = {
        version: 2,
        saveCurrentVersion: true,
        reason: 'Rollback due to error',
      };

      service.rollback.mockResolvedValue(undefined);

      const result = await controller.rollback(workflowId, rollbackDto);

      expect(service.rollback).toHaveBeenCalledWith(workflowId, 2, 'admin');
      expect(result).toEqual({ message: 'Rolled back to version 2' });
    });
  });

  describe('clone', () => {
    it('ينسخ workflow بنجاح', async () => {
      const sourceId = 'wf_source_123';
      const targetMerchantId = '507f1f77bcf86cd799439022';
      const newWorkflowId = 'wf_new_456';

      service.cloneToMerchant.mockResolvedValue(newWorkflowId);

      const result = await controller.clone(sourceId, targetMerchantId);

      expect(service.cloneToMerchant).toHaveBeenCalledWith(
        sourceId,
        targetMerchantId,
        'admin',
      );
      expect(result).toEqual({
        message: 'Cloned successfully',
        newWorkflowId,
      });
    });
  });

  describe('setActive', () => {
    it('يفعل workflow بنجاح', async () => {
      const workflowId = 'wf_123456789';
      const setActiveDto: SetActiveDto = {
        active: true,
        reason: 'Fixed the main issue',
      };

      service.setActive.mockResolvedValue(undefined);

      const result = await controller.setActive(workflowId, setActiveDto);

      expect(service.setActive).toHaveBeenCalledWith(workflowId, true);
      expect(result).toEqual({ message: 'Workflow activated' });
    });

    it('يعطل workflow بنجاح', async () => {
      const workflowId = 'wf_123456789';
      const setActiveDto: SetActiveDto = {
        active: false,
        reason: 'Maintenance mode',
      };

      service.setActive.mockResolvedValue(undefined);

      const result = await controller.setActive(workflowId, setActiveDto);

      expect(service.setActive).toHaveBeenCalledWith(workflowId, false);
      expect(result).toEqual({ message: 'Workflow deactivated' });
    });
  });

  describe('Integration Tests', () => {
    it('يختبر flow كامل: إنشاء → تحديث → استنساخ → تفعيل', async () => {
      const merchantId = '507f1f77bcf86cd799439011';
      const workflowId = 'wf_123456789';
      const targetMerchantId = '507f1f77bcf86cd799439022';
      const clonedWorkflowId = 'wf_cloned_456';

      // 1. إنشاء workflow
      service.createForMerchant.mockResolvedValue(workflowId);
      const createResult = await controller.createForMerchant(merchantId);
      expect(createResult).toEqual({ workflowId });

      // 2. تحديث workflow
      const updateDto: UpdateWorkflowDto = {
        jsonPatch: { name: 'Updated Name' },
      };
      service.update.mockResolvedValue(undefined);
      const updateResult = await controller.update(workflowId, updateDto);
      expect(updateResult.message).toContain('updated');

      // 3. استنساخ workflow
      service.cloneToMerchant.mockResolvedValue(clonedWorkflowId);
      const cloneResult = await controller.clone(workflowId, targetMerchantId);
      expect(cloneResult.newWorkflowId).toBe(clonedWorkflowId);

      // 4. تفعيل المستنسخ
      const activeDto: SetActiveDto = { active: true };
      service.setActive.mockResolvedValue(undefined);
      const activeResult = await controller.setActive(
        clonedWorkflowId,
        activeDto,
      );
      expect(activeResult.message).toContain('activated');

      // التحقق من الاستدعاءات
      expect(service.createForMerchant).toHaveBeenCalled();
      expect(service.update).toHaveBeenCalled();
      expect(service.cloneToMerchant).toHaveBeenCalled();
      expect(service.setActive).toHaveBeenCalled();
    });
  });
});
