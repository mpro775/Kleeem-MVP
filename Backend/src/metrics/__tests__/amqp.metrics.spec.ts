import { AmqpMetrics } from '../amqp.metrics';

const makeCounter = () => ({ inc: jest.fn() });

describe('AmqpMetrics', () => {
  it('increments AMQP counters with labels', () => {
    const deps = {
      pub: makeCounter(),
      con: makeCounter(),
      err: makeCounter(),
    } as any;
    const m = new AmqpMetrics(deps.pub, deps.con, deps.err);

    m.incPublished('ex', 'rk');
    expect(deps.pub.inc).toHaveBeenCalledWith({
      exchange: 'ex',
      routing_key: 'rk',
    });

    m.incConsumed('q1');
    expect(deps.con.inc).toHaveBeenCalledWith({ queue: 'q1' });

    m.incError('worker-a', 'q2');
    expect(deps.err.inc).toHaveBeenCalledWith({
      worker: 'worker-a',
      queue: 'q2',
    });
  });
});
