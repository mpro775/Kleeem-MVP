const config = {
  displayName: 'E2E Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/e2e-setup.ts'],
  testTimeout: 120000, // 2 minutes for E2E tests
  verbose: true,
  bail: false,
  maxWorkers: 1, // E2E tests should run sequentially
  forceExit: true,
  detectOpenHandles: true,
  collectCoverage: false, // Don't collect coverage for E2E tests
};

module.exports = config;
