import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 🔍 إعدادات شاملة
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    
    // 🚀 تحسينات الأداء للاختبارات الشاملة
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,    // السماح بـ forks متعددة
        maxForks: 4,          // عدد أقصى من forks
        minForks: 2,          // عدد أدنى من forks
        isolate: false,       // إيقاف العزل للأداء
      }
    },
    
    // ⏱️ إعدادات التوقيت المطولة
    testTimeout: 30000,      // 30 ثانية لكل اختبار
    hookTimeout: 15000,      // 15 ثانية للـ hooks
    teardownTimeout: 10000,  // 10 ثوانٍ للتنظيف
    
    // 📊 إعدادات التغطية الشاملة
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'json',
        'html',
        'lcov',
        'cobertura',
        'text-summary'
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        'coverage/',
        'dist/',
        'build/',
        '.vite/',
        '.vitest/',
        'scripts/',
        'public/',
        'index.html'
      ],
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // عتبات أعلى للمكونات الأساسية
        './src/app/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        './src/context/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        './src/auth/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      // إعدادات إضافية للتغطية
      all: true,
      clean: true,
      cleanOnRerun: true,
      skipEmpty: false,
      watermarks: {
        statements: [50, 80],
        branches: [50, 80],
        functions: [50, 80],
        lines: [50, 80]
      }
    },
    
    // 🔍 إعدادات المراقبة
    watch: false,
    reporters: [
      'verbose',
      'json',
      'html',
      'junit'
    ],
    
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
      '**/*.stories.*'
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
      junit: './test-results.xml'
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
