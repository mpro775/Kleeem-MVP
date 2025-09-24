import { HttpException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { MerchantsService } from '../../merchants/merchants.service';
import { WorkflowHistoryService } from '../../workflow-history/workflow-history.service';
import { N8nWorkflowService } from '../n8n-workflow.service';
import { N8N_CLIENT } from '../tokens';

import type { N8nClientRepository } from '../repositories/n8n-client.repository';

const historyMock = {
  create: jest.fn(),
  findAllByWorkflow: jest.fn(),
  findVersion: jest.fn(),
};

const merchantsMock = {
  update: jest.fn(),
};

const clientMock: jest.Mocked<N8nClientRepository> = {
  createWorkflow: jest.fn(),
  getWorkflow: jest.fn(),
  patchWorkflow: jest.fn(),
  deleteWorkflow: jest.fn(),
  setActive: jest.fn(),
};

describe('N8nWorkflowService', () => {
  let service: N8nWorkflowService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        N8nWorkflowService,
        { provide: N8N_CLIENT, useValue: clientMock },
        { provide: WorkflowHistoryService, useValue: historyMock },
        { provide: MerchantsService, useValue: merchantsMock },
      ],
    }).compile();

    service = module.get(N8nWorkflowService);
  });

  it('createForMerchant should create, activate, update merchant and write history', async () => {
    clientMock.createWorkflow.mockResolvedValue('wf-123');
    clientMock.setActive.mockResolvedValue();

    const wfId = await service.createForMerchant('m1');

    expect(clientMock.createWorkflow.bind(clientMock)).toHaveBeenCalled();
    expect(clientMock.setActive.bind(clientMock)).toHaveBeenCalledWith(
      'wf-123',
      true,
    );
    expect(merchantsMock.update.bind(merchantsMock)).toHaveBeenCalledWith(
      'm1',
      {
        workflowId: 'wf-123',
      },
    );
    expect(historyMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'm1',
        workflowId: 'wf-123',
        version: 1,
      }),
    );
    expect(wfId).toBe('wf-123');
  });

  it('get should proxy to client', async () => {
    clientMock.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: 'wf-m1',
      nodes: [],
      connections: {},
      active: false,
      settings: {},
      pinData: {},
    });
    const wf = await service.get('wf-1');
    expect(wf.id).toBe('wf-1');
  });

  it('update should patch and add history with incremented version', async () => {
    clientMock.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: 'wf-m1',
      nodes: [],
      connections: {},
      active: true,
      settings: {},
      pinData: {},
    });
    historyMock.findAllByWorkflow.mockResolvedValue([{ version: 3 }]);

    await service.update('wf-1', (j) => ({ ...j, active: false }), 'user-1');

    expect(clientMock.patchWorkflow.bind(clientMock)).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({ active: false }),
    );
    expect(historyMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ version: 4, updatedBy: 'user-1' }),
    );
  });

  it('rollback should patch to version and add history as rollback', async () => {
    historyMock.findVersion.mockResolvedValue({
      merchantId: 'm1',
      workflowId: 'wf-1',
      version: 2,
      workflowJson: {
        name: 'wf-m1',
        nodes: [],
        connections: {},
        settings: {},
        active: true,
        pinData: {},
      },
    });

    await service.rollback('wf-1', 2, 'user-x');

    expect(clientMock.patchWorkflow.bind(clientMock)).toHaveBeenCalled();
    expect(historyMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ isRollback: true, version: 3 }),
    );
  });

  it('rollback should throw when version not found', async () => {
    historyMock.findVersion.mockResolvedValue(null);
    await expect(service.rollback('wf-1', 99, 'u')).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('delete should call client', async () => {
    await service.delete('wf-1');
    expect(clientMock.deleteWorkflow.bind(clientMock)).toHaveBeenCalledWith(
      'wf-1',
    );
  });

  it('setActive should call client', async () => {
    await service.setActive('wf-1', true);
    expect(clientMock.setActive.bind(clientMock)).toHaveBeenCalledWith(
      'wf-1',
      true,
    );
  });
});
