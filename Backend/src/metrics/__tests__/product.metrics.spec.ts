import { ProductMetrics } from '../product.metrics';

const makeCounter = () => ({ inc: jest.fn() });

describe('ProductMetrics', () => {
  it('increments with provided labels', () => {
    const deps = {
      created: makeCounter(),
      updated: makeCounter(),
      deleted: makeCounter(),
    } as any;

    const m = new ProductMetrics(deps.created, deps.updated, deps.deleted);

    m.incCreated('m1', 'c1');
    expect(deps.created.inc).toHaveBeenCalledWith({
      merchant_id: 'm1',
      category: 'c1',
    });

    m.incUpdated('m2', 'c2');
    expect(deps.updated.inc).toHaveBeenCalledWith({
      merchant_id: 'm2',
      category: 'c2',
    });

    m.incDeleted('m3', 'c3');
    expect(deps.deleted.inc).toHaveBeenCalledWith({
      merchant_id: 'm3',
      category: 'c3',
    });
  });

  it('applies default labels when undefined', () => {
    const deps = {
      created: makeCounter(),
      updated: makeCounter(),
      deleted: makeCounter(),
    } as any;
    const m = new ProductMetrics(deps.created, deps.updated, deps.deleted);

    m.incCreated();
    expect(deps.created.inc).toHaveBeenCalledWith({
      merchant_id: 'unknown',
      category: 'none',
    });

    m.incUpdated();
    expect(deps.updated.inc).toHaveBeenCalledWith({
      merchant_id: 'unknown',
      category: 'none',
    });

    m.incDeleted();
    expect(deps.deleted.inc).toHaveBeenCalledWith({
      merchant_id: 'unknown',
      category: 'none',
    });
  });
});
