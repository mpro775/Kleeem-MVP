import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// ⚡ إعدادات Vitest المحسنة - Kaleem Frontend
export default defineConfig({
  plugins: [react()],
  test: {
    // 🔍 إعدادات أساسية
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    
    // 🚀 تحسينات الأداء
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,    // السماح بـ forks متعددة
        maxForks: 4,          // عدد أقصى من forks
        minForks: 2,          // عدد أدنى من forks
        isolate: false,       // إيقاف العزل للأداء
        memoryLimit: '2GB',   // حد الذاكرة لكل fork
      }
    },
    
    // ⏱️ إعدادات التوقيت
    testTimeout: 20000,      // 20 ثانية لكل اختبار
    hookTimeout: 10000,      // 10 ثوانٍ للـ hooks
    teardownTimeout: 8000,   // 8 ثوانٍ للتنظيف
    
    // 📊 إعدادات التغطية
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.e2e.*',
        'coverage/',
        'dist/',
        'build/',
        '.vite/',
        '.vitest/',
        'scripts/',
        'public/',
        'index.html'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        },
        // عتبات أعلى للمكونات الأساسية
        './src/app/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        './src/context/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        './src/auth/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      // إعدادات إضافية للتغطية
      all: true,
      clean: true,
      cleanOnRerun: true,
      skipEmpty: false,
      watermarks: {
        statements: [60, 80],
        branches: [60, 80],
        functions: [60, 80],
        lines: [60, 80]
      }
    },
    
    // 🔍 إعدادات المراقبة
    watch: false,
    reporters: ['verbose', 'json', 'html'],
    
    // 📁 إعدادات الملفات
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '**/*.d.ts',
      '**/*.stories.*',
      '**/*.e2e.*'
    ],
    
    // 🎯 إعدادات DOM محسنة
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        runScripts: 'dangerously',
        url: 'http://localhost:3000'
      }
    },
    
    // 🔧 إعدادات إضافية
    isolate: false,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    
    // 📊 إعدادات التقارير
    outputFile: {
      json: './test-results.json',
      html: './coverage/'
    },
    
    // 🚀 إعدادات الأداء
    maxConcurrency: 4,
    sequence: {
      concurrent: true,
      shuffle: false
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@context': path.resolve(__dirname, './src/context'),
      '@auth': path.resolve(__dirname, './src/auth'),
      '@app': path.resolve(__dirname, './src/app'),
    }
  },
  
  // 🚀 تحسينات البناء
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: ['react', 'react-dom'],
    }
  },
  
  // ⚡ تحسينات التطوير
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'vitest'
    ]
  },
  
  // 🔍 إعدادات الخادم
  server: {
    port: 3000,
    open: false,
    cors: true
  }
});

// 📋 ملاحظات الاستخدام:
// 
// 🚀 للاختبارات السريعة:
//   vitest --config vitest.config.fast.ts
// 
// 🔍 للاختبارات الشاملة:
//   vitest --config vitest.config.comprehensive.ts
// 
// ⚡ للاختبارات المتوازية:
//   vitest --config vitest.config.parallel.ts
// 
// 🎭 لاختبارات E2E:
//   vitest --config vitest.config.e2e.ts
// 
// 📊 للاختبارات العادية:
//   vitest (يستخدم هذا الملف)
