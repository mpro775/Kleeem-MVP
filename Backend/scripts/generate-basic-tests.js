#!/usr/bin/env node

const fs = require('fs');

/**
 * Script لإنشاء اختبارات أساسية للموديولات الأكثر أهمية
 * لزيادة تغطية الاختبارات بسرعة
 */
const stetment1 = 426;
const stetment2 = 380;
const stetment3 = 372;
const stetment4 = 327;
const stetment5 = 306;
const stetment6 = 248;
const stetment7 = 253;
const modulesToTest = [
  { name: 'vector', service: 'VectorService', statements: stetment1 },
  { name: 'auth', service: 'AuthService', statements: stetment2 },
  { name: 'webhooks', service: 'WebhooksService', statements: stetment3 },
  { name: 'merchants', service: 'MerchantsService', statements: stetment4 },
  { name: 'categories', service: 'CategoriesService', statements: stetment5 },
  { name: 'analytics', service: 'AnalyticsService', statements: stetment6 },
  { name: 'chat', service: 'ChatService', statements: stetment7 },
];

function generateBasicServiceTest(moduleName, serviceName) {
  const testDir = `src/modules/${moduleName}/__tests__`;
  const testFile = `${testDir}/${moduleName}.service.spec.ts`;

  // إنشاء المجلد إذا لم يكن موجوداً
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testContent = `import { Test, type TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';

import { ${serviceName} } from '../${moduleName}.service';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${serviceName},
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: JwtService, useValue: mockJwtService },
        // Add other required providers as needed
      ],
    }).compile();

    service = module.get<${serviceName}>(${serviceName});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add more specific tests based on service methods
  // This is a basic template to get coverage started
});`;

  fs.writeFileSync(testFile, testContent);
  console.log(`✅ Created basic test for ${serviceName} in ${testFile}`);
}

function generateBasicControllerTest(moduleName, controllerName) {
  const testDir = `src/modules/${moduleName}/__tests__`;
  const testFile = `${testDir}/${moduleName}.controller.spec.ts`;

  // إنشاء المجلد إذا لم يكن موجوداً
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testContent = `import { Test, type TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';

import { ${controllerName} } from '../${moduleName}.controller';
import { ${controllerName.replace('Controller', 'Service')} } from '../${moduleName}.service';

describe('${controllerName}', () => {
  let controller: ${controllerName};

  beforeEach(async () => {
    const mockService = {
      // Add mock methods based on actual service
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [${controllerName}],
      providers: [
        { provide: ${controllerName.replace('Controller', 'Service')}, useValue: mockService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: JwtService, useValue: mockJwtService },
        // Add other required providers as needed
      ],
    }).compile();

    controller = module.get<${controllerName}>(${controllerName});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // TODO: Add more specific controller tests
  // This is a basic template to get coverage started
});`;

  fs.writeFileSync(testFile, testContent);
  console.log(`✅ Created basic test for ${controllerName} in ${testFile}`);
}

// تشغيل الإنشاء
console.log('🚀 Generating basic tests for high-impact modules...\n');

modulesToTest.forEach(({ name, service }) => {
  try {
    // إنشاء اختبار للخدمة
    generateBasicServiceTest(name, service);

    // إنشاء اختبار للـ controller إذا كان موجوداً
    const controllerName = `${service.replace('Service', 'Controller')}`;
    const controllerPath = `src/modules/${name}/${name}.controller.ts`;
    if (fs.existsSync(controllerPath)) {
      generateBasicControllerTest(name, controllerName);
    }
  } catch (error) {
    console.error(`❌ Error creating tests for ${name}:`, error.message);
  }
});

console.log('\n✅ Basic tests generation completed!');
console.log('📝 Next steps:');
console.log('1. Run the tests: npm run test:coverage');
console.log('2. Check coverage improvements');
console.log('3. Expand tests with actual business logic');
console.log('4. Fix any dependency issues in the generated tests');
