import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 🎭 إعدادات اختبارات E2E
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup-e2e.ts'],
    
    // 🚀 إعدادات الأداء لـ E2E
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,     // fork واحد لاختبارات E2E
        maxForks: 1,          // عدد أقصى من forks
        minForks: 1,          // عدد أدنى من forks
        isolate: true,        // تفعيل العزل لـ E2E
        memoryLimit: '4GB',   // حد ذاكرة أعلى لـ E2E
      }
    },
    
    // ⏱️ إعدادات التوقيت المطولة لـ E2E
    testTimeout: 60000,      // دقيقة واحدة لكل اختبار
    hookTimeout: 30000,      // 30 ثانية للـ hooks
    teardownTimeout: 20000,  // 20 ثانية للتنظيف
    
    // 📊 إعدادات التغطية لـ E2E
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
        '**/*.e2e.*'          // استبعاد ملفات E2E من التغطية
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
    
    // 🔍 إعدادات المراقبة
    watch: false,
    reporters: ['verbose', 'json', 'html'],
    
    // 📁 إعدادات الملفات لـ E2E
    include: [
      'src/**/*.e2e.{js,jsx,ts,tsx}',
      'tests/e2e/**/*.{js,jsx,ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*'
    ],
    
    // 🎯 إعدادات DOM محسنة لـ E2E
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        runScripts: 'dangerously',
        url: 'http://localhost:3000',
        // إعدادات إضافية لـ E2E
        cookieJar: true,
        referrer: 'http://localhost:3000',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    },
    
    // 🔧 إعدادات إضافية لـ E2E
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    
    // 📊 إعدادات التقارير
    outputFile: {
      json: './e2e-test-results.json',
      html: './e2e-coverage/'
    },
    
    // 🚀 إعدادات الأداء لـ E2E
    maxConcurrency: 1,       // اختبار واحد في المرة لـ E2E
    sequence: {
      concurrent: false,      // إيقاف التزامن لـ E2E
      shuffle: false
    },
    
    // ⚡ تحسينات إضافية لـ E2E
    bail: 1,                  // إيقاف الاختبارات عند الفشل
    retry: 0,                 // عدم إعادة المحاولة لـ E2E
    threads: false,           // إيقاف threads لصالح forks
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
      '@e2e': path.resolve(__dirname, './tests/e2e'),
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
      'playwright',
      'vitest'
    ]
  },
  
  // 🔍 إعدادات الخادم لـ E2E
  server: {
    port: 3000,
    open: false,
    cors: true,
    host: '0.0.0.0'          // السماح بالوصول من الخارج
  }
});
