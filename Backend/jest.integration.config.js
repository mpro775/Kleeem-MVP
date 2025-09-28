const config = {
  displayName: 'Integration Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  testMatch: ['**/*.integration.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^ioredis$': '<rootDir>/test/mocks/ioredis.mock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
  testTimeout: 60000,
  verbose: true,
  bail: false,
  maxWorkers: 1, // Integration tests should run sequentially
  forceExit: true,
  detectOpenHandles: true,
  collectCoverage: false, // Don't collect coverage for integration tests
};

module.exports = config;
