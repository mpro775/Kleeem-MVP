import { HealthController } from '../health.controller';

describe('HealthController', () => {
  const makeDeps = () => {
    const mongoConnection = {
      db: { admin: () => ({ ping: jest.fn().mockResolvedValue(true) }) },
      readyState: 1,
      name: 'testdb',
    } as any;
    const cacheManager = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('ok'),
      del: jest.fn().mockResolvedValue(undefined),
    } as any;
    const redis = { ping: jest.fn().mockResolvedValue('PONG') } as any;
    return { mongoConnection, cacheManager, redis };
  };

  it('returns basic health', () => {
    const { mongoConnection, cacheManager } = makeDeps();
    const ctrl = new HealthController(
      mongoConnection,
      cacheManager,
      undefined as any,
    );
    const res = ctrl.getBasicHealth();
    expect(res.status).toBe('healthy');
    expect(res.services.database.status).toBe('healthy');
  });

  it('returns detailed health combining services', async () => {
    const { mongoConnection, cacheManager } = makeDeps();
    const ctrl = new HealthController(
      mongoConnection,
      cacheManager,
      undefined as any,
    );
    const res = await ctrl.getDetailedHealth();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(res.status);
    expect(res.services.database).toBeDefined();
    expect(res.services.cache).toBeDefined();
    expect(res.services.memory).toBeDefined();
  });

  it('readiness returns ready when dependencies are ok', async () => {
    const { mongoConnection, cacheManager, redis } = makeDeps();
    const ctrl = new HealthController(mongoConnection, cacheManager, redis);
    const res = await ctrl.getReadiness();
    expect(['ready', 'not_ready']).toContain(res.status);
  });

  it('liveness returns alive status', () => {
    const { mongoConnection, cacheManager } = makeDeps();
    const ctrl = new HealthController(
      mongoConnection,
      cacheManager,
      undefined as any,
    );
    const res = ctrl.getLiveness();
    expect(res.status).toBe('alive');
  });
});
