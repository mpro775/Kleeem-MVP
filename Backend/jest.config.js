/** @type {import('jest').Config} */
const commonMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@common/(.*)$': '<rootDir>/src/common/$1',
  '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
  '^src/(.*)$': '<rootDir>/src/$1',
  '^ioredis$': '<rootDir>/test/mocks/ioredis.mock.js',
  '^file-type$': '<rootDir>/test/mocks/file-type.mock.ts',
};
const commonTransform = { '^.+\\.(t|j)s$': 'ts-jest' };
const commonFiles = ['js', 'json', 'ts'];

module.exports = {
  testEnvironment: 'node',
  // عالميًا: جمع التغطية لجميع الاختبارات
  collectCoverage: true,
  // عالميًا: موفّر التغطية
  coverageProvider: 'v8',

  // خطط التغطية المطلوبة
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
      branches: 60, // عندك أعلى بكثير، فوّتها
      functions: 40, // واقعي الآن، وارفعه لاحقًا تدريجيًا
    },
  },

  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.spec.ts', // الحالي
        '<rootDir>/src/**/__tests__/**/*.ts', // يدعم مجلد __tests__
        '<rootDir>/test/unit/**/*.spec.ts', // لو لديك test/unit
        '<rootDir>/src/**/*.test.ts', // لو تستخدم *.test.ts
      ],
      setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
      moduleNameMapper: commonMapper,
      transform: commonTransform,
      moduleFileExtensions: commonFiles,
      // لا تضع collectCoverage/coverageProvider/forceExit هنا
      // ضع collectCoverageFrom هنا إن أردت تخصيص ملفات التغطية للوحدة فقط:
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.types.ts',
        '!src/**/*.enum.ts',
        '!src/**/*.schema.ts',
        '!src/**/*.module.ts',
        '!src/**/index.ts', // ملفات التصدير البسيطة
        '!src/**/constants/**', // الثوابت فقط إذا لم تحتوي على منطق
        '!src/**/migrations/**',
        '!src/**/__mocks__/**',
        // شمل main.ts وbootstrap لأنهما يحتويان على منطق مهم
        // '!src/**/main.ts', // تم تعطيله - main.ts مهم للتغطية
        // '!src/bootstrap/**', // تم تعطيله جزئياً - فقط ملفات البوتستراب البسيطة جداً
      ],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
      detectOpenHandles: true,
      moduleNameMapper: commonMapper,
      transform: commonTransform,
      moduleFileExtensions: commonFiles,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/e2e-setup.ts'],
      detectOpenHandles: true,
      moduleNameMapper: commonMapper,
      transform: commonTransform,
      moduleFileExtensions: commonFiles,
    },
  ],
};
