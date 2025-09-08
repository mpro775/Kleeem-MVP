import 'jest-extended';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.setTimeout(60000);

// Global test setup for integration tests
beforeAll(async () => {
  // Suppress console output during tests
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

// Clean up after tests
afterAll(async () => {
  // Close any open handles
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Handle MongoDB Memory Server cleanup
process.on('exit', () => {
  console.log('Test process exiting...');
});

// Global error handlers for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
