import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // ⚡ إعدادات للأداء السريع
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    
    // 🚀 تحسينات الأداء
    pool: 'forks',           // استخدام forks بدلاً من threads
    poolOptions: {
      forks: {
        singleFork: true,     // fork واحد للاختبارات السريعة
        maxForks: 1,          // عدد أقصى من forks
        minForks: 1,          // عدد أدنى من forks
      }
    },
    
    // ⏱️ إعدادات التوقيت
    testTimeout: 10000,      // 10 ثوانٍ لكل اختبار
    hookTimeout: 5000,       // 5 ثوانٍ للـ hooks
    teardownTimeout: 5000,   // 5 ثوانٍ للتنظيف
    
    // 📊 إعدادات التغطية
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
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // 🔍 إعدادات المراقبة
    watch: false,            // إيقاف المراقبة للاختبارات السريعة
    reporters: ['verbose'],  // تقرير مفصل
    
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
    
    // 🎯 إعدادات DOM
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        runScripts: 'dangerously'
      }
    },
    
    // 🔧 إعدادات إضافية
    isolate: false,          // إيقاف العزل للأداء الأفضل
    restoreMocks: true,      // استعادة الـ mocks تلقائياً
    clearMocks: true,        // مسح الـ mocks تلقائياً
    mockReset: true,         // إعادة تعيين الـ mocks
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
    include: ['react', 'react-dom', '@testing-library/react', '@testing-library/jest-dom']
  },
  
  // 🔍 إعدادات الخادم
  server: {
    port: 3000,
    open: false,
    cors: true
  }
});
