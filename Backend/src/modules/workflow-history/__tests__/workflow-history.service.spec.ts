import { Types } from 'mongoose';

import { WorkflowHistoryService } from '../workflow-history.service';

describe('WorkflowHistoryService', () => {
  const makeModel = () =>
    ({
      create: jest.fn((d) => ({ _id: new Types.ObjectId(), ...d })),
      find: jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
      findOne: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    }) as any;

  it('create/findAllByWorkflow/findVersion', async () => {
    const model = makeModel();
    const svc = new WorkflowHistoryService(model);
    await svc.create({ workflowId: 'wf', version: 1 });
    await svc.findAllByWorkflow('wf');
    await svc.findVersion('wf', 1);
    expect(model.create).toHaveBeenCalled();
    expect(model.find).toHaveBeenCalled();
    expect(model.findOne).toHaveBeenCalled();
  });
});
