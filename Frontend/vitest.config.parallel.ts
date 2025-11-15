import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 🚀 إعدادات للأداء الأقصى
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    
    // ⚡ تحسينات الأداء المتوازي
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,    // إيقاف fork واحد
        maxForks: 8,          // عدد أقصى من forks
        minForks: 4,          // عدد أدنى من forks
        isolate: false,       // إيقاف العزل للأداء
        memoryLimit: '2GB',   // حد الذاكرة لكل fork
      }
    },
    
    // ⏱️ إعدادات التوقيت السريعة
    testTimeout: 15000,      // 15 ثانية لكل اختبار
    hookTimeout: 8000,       // 8 ثوانٍ للـ hooks
    teardownTimeout: 5000,   // 5 ثوانٍ للتنظيف
    
    // 📊 إعدادات التغطية الأساسية
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
        '.vitest/'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    },
    
    // 🔍 إعدادات المراقبة
    watch: false,
    reporters: ['basic', 'json'],
    
    // 📁 إعدادات الملفات
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '**/*.d.ts'
    ],
    
    // 🎯 إعدادات DOM محسنة
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        runScripts: 'dangerously'
      }
    },
    
    // 🔧 إعدادات إضافية
    isolate: false,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    
    // 📊 إعدادات التقارير
    outputFile: {
      json: './test-results-parallel.json'
    },
    
    // 🚀 إعدادات الأداء المتوازي
    maxConcurrency: 8,
    sequence: {
      concurrent: true,
      shuffle: false
    },
    
    // ⚡ تحسينات إضافية
    bail: 0,                 // عدم إيقاف الاختبارات عند الفشل
    retry: 1,                // إعادة المحاولة مرة واحدة
    threads: false,          // إيقاف threads لصالح forks
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
      '@testing-library/user-event'
    ]
  },
  
  // 🔍 إعدادات الخادم
  server: {
    port: 3000,
    open: false,
    cors: true
  }
});
