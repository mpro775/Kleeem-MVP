import { ValidationPipe } from '@nestjs/common';

import { configurePipes } from './configure-pipes';

// Mock ValidationPipe
jest.mock('@nestjs/common', () => ({
  ValidationPipe: jest.fn().mockImplementation((options) => ({
    options,
    name: 'ValidationPipe',
  })),
}));

describe('configurePipes', () => {
  let mockApp: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock NestApplication
    mockApp = {
      useGlobalPipes: jest.fn(),
    };
  });

  it('should configure global pipes with ValidationPipe', () => {
    configurePipes(mockApp);

    expect(mockApp.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(ValidationPipe).toHaveBeenCalledTimes(1);
  });

  it('should configure ValidationPipe with correct options', () => {
    configurePipes(mockApp);

    expect(ValidationPipe).toHaveBeenCalledWith({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    });
  });

  it('should call useGlobalPipes with the ValidationPipe instance', () => {
    const mockValidationPipeInstance = { name: 'ValidationPipe' };
    (ValidationPipe as jest.MockedClass<any>).mockReturnValue(
      mockValidationPipeInstance,
    );

    configurePipes(mockApp);

    expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
      mockValidationPipeInstance,
    );
  });

  it('should enable whitelist option', () => {
    configurePipes(mockApp);

    const callArgs = (ValidationPipe as jest.MockedClass<any>).mock.calls[0][0];
    expect(callArgs.whitelist).toBe(true);
  });

  it('should enable transform option', () => {
    configurePipes(mockApp);

    const callArgs = (ValidationPipe as jest.MockedClass<any>).mock.calls[0][0];
    expect(callArgs.transform).toBe(true);
  });

  it('should configure transform options with implicit conversion enabled', () => {
    configurePipes(mockApp);

    const callArgs = (ValidationPipe as jest.MockedClass<any>).mock.calls[0][0];
    expect(callArgs.transformOptions).toEqual({
      enableImplicitConversion: true,
    });
  });

  it('should not forbid non-whitelisted properties', () => {
    configurePipes(mockApp);

    const callArgs = (ValidationPipe as jest.MockedClass<any>).mock.calls[0][0];
    expect(callArgs.forbidNonWhitelisted).toBe(false);
  });

  it('should handle multiple calls correctly', () => {
    configurePipes(mockApp);
    configurePipes(mockApp);

    expect(mockApp.useGlobalPipes).toHaveBeenCalledTimes(2);
    expect(ValidationPipe).toHaveBeenCalledTimes(2);
  });

  it('should work with different app instances', () => {
    const mockApp1 = { useGlobalPipes: jest.fn() };
    const mockApp2 = { useGlobalPipes: jest.fn() };

    configurePipes(mockApp1 as any);
    configurePipes(mockApp2 as any);

    expect(mockApp1.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(mockApp2.useGlobalPipes).toHaveBeenCalledTimes(1);
  });
});
