require('jest-extended');
import 'reflect-metadata';
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

jest.setTimeout(30000);

// Mock external services
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    off: jest.fn(),
  }));
});

// Mock file-type (only if module exists)
try {
  jest.mock('file-type', () => ({
    fileTypeFromBuffer: jest.fn(),
  }));
} catch {
  // Module not found, skip mock
}

// Mock MongoDB Memory Server
jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
    getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
  })),
}));

// Mock Bull Queue
jest.mock('bull', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

// Mock MinIO
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(true),
    putObject: jest.fn().mockResolvedValue({ etag: 'test-etag' }),
    getObject: jest.fn().mockReturnValue({
      pipe: jest.fn(),
      on: jest.fn(),
    }),
    presignedGetObject: jest.fn().mockResolvedValue('http://test-url'),
  })),
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
