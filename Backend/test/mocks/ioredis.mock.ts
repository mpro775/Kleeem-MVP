// test/mocks/ioredis.mock.ts
export default class Redis {
  get() {
    return Promise.resolve(null);
  }
  set() {
    return Promise.resolve('OK');
  }
  del() {
    return Promise.resolve(1);
  }
  quit() {
    return Promise.resolve();
  }
}
