// test/mocks/ioredis.mock.ts
export default class Redis {
  get(key: string): Promise<string | null> {
    return Promise.resolve(typeof key === 'string' ? null : (key[0] ?? null));
  }
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttl: number,
  ): Promise<'OK' | null> {
    return Promise.resolve(mode === 'EX' && ttl > 0 ? 'OK' : null);
  }
  del(key: string | string[]): Promise<number> {
    return Promise.resolve(typeof key === 'string' ? 1 : key.length);
  }
  quit(): Promise<void> {
    return Promise.resolve();
  }
}
