import 'jest-extended';

jest.setTimeout(120000); // 2 minutes for E2E tests

// Global setup for E2E tests
beforeAll(() => {
  // Suppress console output during tests to reduce noise
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: originalConsole.warn, // Keep warnings visible
    error: originalConsole.error, // Keep errors visible
  };
});

// Global cleanup
afterAll(async () => {
  // Give time for cleanup operations
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

// Handle process cleanup
process.on('exit', () => {
  console.log('E2E test process exiting...');
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error(
    'Unhandled Rejection in E2E tests at:',
    promise,
    'reason:',
    reason,
  );
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in E2E tests:', error);
});
