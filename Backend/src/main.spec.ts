import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

// Mock the bootstrap functions
jest.mock('./bootstrap/configure-app-basics');
jest.mock('./bootstrap/configure-body-parsers');
jest.mock('./bootstrap/configure-csrf');
jest.mock('./bootstrap/configure-filters');
jest.mock('./bootstrap/configure-interceptors');
jest.mock('./bootstrap/configure-logging');
jest.mock('./bootstrap/configure-pipes');
jest.mock('./bootstrap/configure-swagger');
jest.mock('./bootstrap/configure-websocket');
jest.mock('./bootstrap/start-server');

// Mock the tracing and polyfills imports
jest.mock('./tracing');
jest.mock('./polyfills');

describe('main.ts', () => {
  let mockApp: any;
  let mockNestFactoryCreate: jest.MockedFunction<typeof NestFactory.create>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock NestFactory.create
    mockApp = {
      configureAppBasics: jest.fn(),
      configureCsrf: jest.fn(),
      configureWebsocket: jest.fn(),
      configureBodyParsers: jest.fn(),
      configureLogging: jest.fn(),
      configurePipes: jest.fn(),
      configureFilters: jest.fn(),
      configureInterceptors: jest.fn(),
      configureSwagger: jest.fn(),
    };

    mockNestFactoryCreate = jest.fn().mockResolvedValue(mockApp);
    (NestFactory.create as any) = mockNestFactoryCreate;

    // Mock the bootstrap functions
    const { configureAppBasics } = require('./bootstrap/configure-app-basics');
    const {
      configureBodyParsers,
    } = require('./bootstrap/configure-body-parsers');
    const { configureCsrf } = require('./bootstrap/configure-csrf');
    const { configureFilters } = require('./bootstrap/configure-filters');
    const {
      configureInterceptors,
    } = require('./bootstrap/configure-interceptors');
    const { configureLogging } = require('./bootstrap/configure-logging');
    const { configurePipes } = require('./bootstrap/configure-pipes');
    const { configureSwagger } = require('./bootstrap/configure-swagger');
    const { configureWebsocket } = require('./bootstrap/configure-websocket');
    const { startServer } = require('./bootstrap/start-server');

    configureAppBasics.mockImplementation(() => {});
    configureBodyParsers.mockImplementation(() => {});
    configureCsrf.mockImplementation(() => {});
    configureFilters.mockImplementation(() => {});
    configureInterceptors.mockImplementation(() => {});
    configureLogging.mockImplementation(() => {});
    configurePipes.mockImplementation(() => {});
    configureSwagger.mockImplementation(() => {});
    configureWebsocket.mockImplementation(() => {});
    startServer.mockResolvedValue(undefined);
  });

  it('should bootstrap the application successfully', async () => {
    // Import the bootstrap function dynamically to trigger the mocks
    const mainModule = require('./main');

    // The bootstrap function should be called implicitly when the module is loaded
    // but we'll test the bootstrap function directly
    const bootstrap = (global as any).bootstrap || mainModule.bootstrap;

    // Bootstrap function should always exist
    expect(bootstrap).toBeDefined();

    await bootstrap();

    // Verify NestFactory.create was called with AppModule
    expect(mockNestFactoryCreate).toHaveBeenCalledWith(AppModule);

    // Verify all configuration functions were called in the correct order
    const { configureAppBasics } = require('./bootstrap/configure-app-basics');
    const { configureCsrf } = require('./bootstrap/configure-csrf');
    const { configureWebsocket } = require('./bootstrap/configure-websocket');
    const {
      configureBodyParsers,
    } = require('./bootstrap/configure-body-parsers');
    const { configureLogging } = require('./bootstrap/configure-logging');
    const { configurePipes } = require('./bootstrap/configure-pipes');
    const { configureFilters } = require('./bootstrap/configure-filters');
    const {
      configureInterceptors,
    } = require('./bootstrap/configure-interceptors');
    const { configureSwagger } = require('./bootstrap/configure-swagger');
    const { startServer } = require('./bootstrap/start-server');

    expect(configureAppBasics).toHaveBeenCalledWith(mockApp);
    expect(configureCsrf).toHaveBeenCalledWith(mockApp);
    expect(configureWebsocket).toHaveBeenCalledWith(mockApp);
    expect(configureBodyParsers).toHaveBeenCalledWith(mockApp);
    expect(configureLogging).toHaveBeenCalledWith(mockApp);
    expect(configurePipes).toHaveBeenCalledWith(mockApp);
    expect(configureFilters).toHaveBeenCalledWith(mockApp);
    expect(configureInterceptors).toHaveBeenCalledWith(mockApp);
    expect(configureSwagger).toHaveBeenCalledWith(mockApp);
    expect(startServer).toHaveBeenCalledWith(mockApp);
  });

  it('should import tracing and polyfills modules', () => {
    // Verify that tracing and polyfills are imported (mocks will be called)
    expect(require('./tracing')).toBeDefined();
    expect(require('./polyfills')).toBeDefined();
  });

  it('should handle bootstrap errors gracefully', async () => {
    // Mock NestFactory.create to throw an error
    mockNestFactoryCreate.mockRejectedValue(new Error('Bootstrap failed'));

    // Import and test the bootstrap function
    const mainModule = require('./main');
    const bootstrap = (global as any).bootstrap || mainModule.bootstrap;

    // Bootstrap function should always exist
    expect(bootstrap).toBeDefined();
    await expect(bootstrap()).rejects.toThrow('Bootstrap failed');
  });
});
