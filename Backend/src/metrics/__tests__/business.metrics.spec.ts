import { BusinessMetrics } from '../business.metrics';

const makeCounter = () => ({ inc: jest.fn() });

describe('BusinessMetrics', () => {
  it('increments all counters', () => {
    const deps = {
      merchantCreated: makeCounter(),
      n8nWorkflowCreated: makeCounter(),
      emailSent: makeCounter(),
      emailFailed: makeCounter(),
      passwordChangeCompleted: makeCounter(),
    } as any;

    const m = new BusinessMetrics(
      deps.merchantCreated,
      deps.n8nWorkflowCreated,
      deps.emailSent,
      deps.emailFailed,
      deps.passwordChangeCompleted,
    );

    m.incMerchantCreated();
    m.incN8nWorkflowCreated();
    m.incEmailSent();
    m.incEmailFailed();
    m.incPasswordChangeCompleted();

    expect(deps.merchantCreated.inc).toHaveBeenCalledTimes(1);
    expect(deps.n8nWorkflowCreated.inc).toHaveBeenCalledTimes(1);
    expect(deps.emailSent.inc).toHaveBeenCalledTimes(1);
    expect(deps.emailFailed.inc).toHaveBeenCalledTimes(1);
    expect(deps.passwordChangeCompleted.inc).toHaveBeenCalledTimes(1);
  });
});
