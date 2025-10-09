import { Types } from 'mongoose';

import { N8nWorkflowController } from '../n8n-workflow.controller';

describe('N8nWorkflowController', () => {
  const makeDeps = () => {
    const service = {
      createForMerchant: jest.fn().mockResolvedValue('wf_new'),
      get: jest.fn().mockResolvedValue({ id: 'wf' }),
      update: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      cloneToMerchant: jest.fn().mockResolvedValue('wf_cloned'),
      setActive: jest.fn().mockResolvedValue(undefined),
    } as any;
    const merchantModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId(),
              workflowId: 'wf_existing',
            }),
          }),
        }),
      }),
    } as any;
    return { service, merchantModel };
  };

  it('create/get/update basic paths', async () => {
    const { service, merchantModel } = makeDeps();
    const ctrl = new N8nWorkflowController(service, merchantModel);
    const created = await ctrl.createForMerchant('m');
    expect(created.workflowId).toBe('wf_new');
    await ctrl.get('wf');
    expect(service.get).toHaveBeenCalled();
    await ctrl.update('wf', { jsonPatch: { a: 1 } } as any);
    expect(service.update).toHaveBeenCalled();
  });

  it('rollback/clone/setActive', async () => {
    const { service, merchantModel } = makeDeps();
    const ctrl = new N8nWorkflowController(service, merchantModel);
    await ctrl.rollback('wf', { version: 1 });
    expect(service.rollback).toHaveBeenCalled();
    const cloneRes = await ctrl.clone('wf', 'm2');
    expect(cloneRes.newWorkflowId).toBe('wf_cloned');
    await ctrl.setActive('wf', { active: true } as any);
    expect(service.setActive).toHaveBeenCalledWith('wf', true);
  });

  it('ensureMine creates or reuses workflow and activates by default', async () => {
    const { service, merchantModel } = makeDeps();
    const ctrl = new N8nWorkflowController(service, merchantModel);
    const res = await ctrl.ensureMine(
      { user: { userId: 'u', merchantId: 'm' } } as any,
      { activate: true } as any,
    );
    expect(res.workflowId).toBeDefined();
    expect(res.activated).toBe(true);
  });
});
