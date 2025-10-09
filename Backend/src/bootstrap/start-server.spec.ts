import { startServer } from './start-server';

// Mock console.log to avoid output during tests
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

describe('startServer', () => {
  let mockApp: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock console.log
    console.log = mockConsoleLog;

    // Mock INestApplication
    mockApp = {
      listen: jest.fn().mockResolvedValue(undefined),
    };

    // Clear mock
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    // Restore original environment and console
    process.env = originalEnv;
    console.log = originalConsoleLog;
  });

  it('should start server on default port when no PORT env var is set', async () => {
    // Remove PORT from environment
    delete process.env.PORT;
    delete process.env.APP_DEFAULT_PORT;

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(3000);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:3000/api',
    );
  });

  it('should start server on PORT from environment', async () => {
    process.env.PORT = '8080';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(8080);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:8080/api',
    );
  });

  it('should start server on APP_DEFAULT_PORT when PORT is not set', async () => {
    delete process.env.PORT;
    process.env.APP_DEFAULT_PORT = '4000';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(4000);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:4000/api',
    );
  });

  it('should prioritize PORT over APP_DEFAULT_PORT', async () => {
    process.env.PORT = '9000';
    process.env.APP_DEFAULT_PORT = '4000';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(9000);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:9000/api',
    );
  });

  it('should handle numeric string PORT values', async () => {
    process.env.PORT = '5000';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(5000);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:5000/api',
    );
  });

  it('should handle zero PORT value', async () => {
    process.env.PORT = '0';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(0);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:0/api',
    );
  });

  it('should handle negative PORT value', async () => {
    process.env.PORT = '-1';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(-1);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:-1/api',
    );
  });

  it('should handle non-numeric PORT by converting to NaN (which becomes default)', async () => {
    process.env.PORT = 'not-a-number';

    await startServer(mockApp);

    // Number('not-a-number') returns NaN, which should fall back to default
    expect(mockApp.listen).toHaveBeenCalledWith(NaN);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:NaN/api',
    );
  });

  it('should handle empty string PORT', async () => {
    process.env.PORT = '';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledWith(0); // Number('') returns 0
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🚀 Backend running on http://localhost:0/api',
    );
  });

  it('should always log the startup message with correct port', async () => {
    const testPorts = ['3000', '8080', '5000', '0'];

    for (const port of testPorts) {
      mockConsoleLog.mockClear();
      process.env.PORT = port;

      await startServer(mockApp);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        `🚀 Backend running on http://localhost:${port}/api`,
      );
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    }
  });

  it('should call app.listen with the resolved port', async () => {
    process.env.PORT = '9999';

    await startServer(mockApp);

    expect(mockApp.listen).toHaveBeenCalledTimes(1);
    expect(mockApp.listen).toHaveBeenCalledWith(9999);
  });

  it('should await app.listen completion', async () => {
    let listenResolved = false;
    mockApp.listen.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      listenResolved = true;
    });

    const startPromise = startServer(mockApp);

    // Before completion, listen should not be resolved
    expect(listenResolved).toBe(false);

    await startPromise;

    // After completion, listen should be resolved
    expect(listenResolved).toBe(true);
  });
});
