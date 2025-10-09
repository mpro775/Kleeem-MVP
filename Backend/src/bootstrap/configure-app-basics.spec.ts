import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { setupApp } from '../common/config/app.config';

import { configureAppBasics } from './configure-app-basics';

import type { EnvironmentValidatorService } from '../common/services/environment-validator.service';

// Mock the setupApp function
jest.mock('../common/config/app.config', () => ({
  setupApp: jest.fn(),
}));

describe('configureAppBasics', () => {
  let mockApp: any;
  let mockConfigService: ConfigService;
  let mockEnvValidator: jest.Mocked<
    Pick<
      EnvironmentValidatorService,
      'validateOrExit' | 'logEnvironmentSummary'
    >
  >;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    // Mock EnvironmentValidatorService
    mockEnvValidator = {
      validateOrExit: jest.fn(),
      logEnvironmentSummary: jest.fn(),
    };

    // Mock NestExpressApplication
    mockApp = {
      get: jest.fn((service: any) => {
        if (service === ConfigService) return mockConfigService;
        if (service === 'EnvironmentValidatorService') return mockEnvValidator;
        return undefined;
      }),
      setGlobalPrefix: jest.fn(),
      set: jest.fn(),
      enableShutdownHooks: jest.fn(),
    };
  });

  it('should configure app basics correctly', () => {
    configureAppBasics(mockApp);

    // Verify setupApp was called
    expect(setupApp).toHaveBeenCalledWith(mockApp, mockConfigService);

    // Verify environment validator calls
    expect(mockEnvValidator.validateOrExit).toHaveBeenCalled();
    expect(mockEnvValidator.logEnvironmentSummary).toHaveBeenCalled();

    // Verify global prefix setup
    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api', {
      exclude: [{ path: 'metrics', method: RequestMethod.GET }],
    });

    // Verify trust proxy setting
    expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 1);

    // Verify shutdown hooks enabled
    expect(mockApp.enableShutdownHooks).toHaveBeenCalled();
  });

  it('should ensure crypto.randomUUID is available', () => {
    // Save original crypto
    const originalCrypto = (globalThis as any).crypto;

    // Remove crypto.randomUUID temporarily
    delete (globalThis as any).crypto;

    configureAppBasics(mockApp);

    // Verify crypto.randomUUID is now available
    expect(typeof (globalThis as any).crypto?.randomUUID).toBe('function');
    expect((globalThis as any).crypto.randomUUID()).toBeDefined();

    // Restore original crypto
    (globalThis as any).crypto = originalCrypto;
  });

  it('should handle existing crypto object', () => {
    // Save original crypto
    const originalCrypto = (globalThis as any).crypto;

    // Set crypto with some existing properties
    (globalThis as any).crypto = {
      getRandomValues: jest.fn(),
    };

    configureAppBasics(mockApp);

    // Verify crypto.randomUUID was added without removing existing properties
    expect(typeof (globalThis as any).crypto?.randomUUID).toBe('function');
    expect(typeof (globalThis as any).crypto?.getRandomValues).toBe('function');

    // Restore original crypto
    (globalThis as any).crypto = originalCrypto;
  });

  it('should not modify crypto if randomUUID already exists', () => {
    // Save original crypto
    const originalCrypto = (globalThis as any).crypto;
    const originalRandomUUID = (globalThis as any).crypto?.randomUUID;

    // Set crypto with existing randomUUID
    const existingRandomUUID = jest.fn(() => 'existing-uuid');
    (globalThis as any).crypto = {
      ...((globalThis as any).crypto || {}),
      randomUUID: existingRandomUUID,
    };

    configureAppBasics(mockApp);

    // Verify the existing randomUUID was preserved
    expect((globalThis as any).crypto.randomUUID).toBe(existingRandomUUID);

    // Restore original crypto
    (globalThis as any).crypto = originalCrypto;
    if (originalRandomUUID) {
      (globalThis as any).crypto.randomUUID = originalRandomUUID;
    }
  });

  it('should handle missing crypto object', () => {
    // Save original crypto
    const originalCrypto = (globalThis as any).crypto;

    // Completely remove crypto
    delete (globalThis as any).crypto;

    configureAppBasics(mockApp);

    // Verify crypto object was created with randomUUID
    expect((globalThis as any).crypto).toBeDefined();
    expect(typeof (globalThis as any).crypto.randomUUID).toBe('function');

    // Restore original crypto
    (globalThis as any).crypto = originalCrypto;
  });

  it('should call all configuration methods in correct order', () => {
    const callOrder: string[] = [];

    // Mock setupApp to track call order
    (setupApp as jest.Mock).mockImplementation(() => {
      callOrder.push('setupApp');
    });

    mockEnvValidator.validateOrExit.mockImplementation(() => {
      callOrder.push('validateOrExit');
    });

    mockEnvValidator.logEnvironmentSummary.mockImplementation(() => {
      callOrder.push('logEnvironmentSummary');
    });

    mockApp.setGlobalPrefix.mockImplementation(() => {
      callOrder.push('setGlobalPrefix');
    });

    mockApp.set.mockImplementation(() => {
      callOrder.push('setTrustProxy');
    });

    mockApp.enableShutdownHooks.mockImplementation(() => {
      callOrder.push('enableShutdownHooks');
    });

    configureAppBasics(mockApp);

    expect(callOrder).toEqual([
      'setupApp',
      'validateOrExit',
      'logEnvironmentSummary',
      'setGlobalPrefix',
      'setTrustProxy',
      'enableShutdownHooks',
    ]);
  });
});
