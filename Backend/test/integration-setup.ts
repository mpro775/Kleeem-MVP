import 'jest-extended';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let repl: MongoMemoryReplSet;

jest.setTimeout(60_000);

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = repl.getUri();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  await repl?.stop();
  await new Promise((r) => setTimeout(r, 500));
});
