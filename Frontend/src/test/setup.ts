import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 🚀 إعدادات محسنة للاختبارات - Kaleem Frontend

// 🔧 Mock للـ console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // إيقاف console.error و console.warn في الاختبارات
  console.error = vi.fn();
  console.warn = vi.fn();
  
  // إعداد JSDOM
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  
  // Mock للـ IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock للـ ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock للـ window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
  });
  
  // Mock للـ window.scrollY
  Object.defineProperty(window, 'scrollY', {
    writable: true,
    value: 0,
  });
  
  // Mock للـ window.innerHeight
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    value: 768,
  });
  
  // Mock للـ window.innerWidth
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024,
  });
  
  // Mock للـ HTMLElement.prototype.clientWidth
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 800,
  });
  
  // Mock للـ HTMLElement.prototype.clientHeight
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 600,
  });
  
  // Mock للـ Element.prototype.scrollTo
  Element.prototype.scrollTo = vi.fn();
  
  // Mock للـ Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  
  // Mock للـ Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));
});

afterAll(() => {
  // استعادة console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

beforeEach(() => {
  // مسح الـ mocks قبل كل اختبار
  vi.clearAllMocks();
  
  // إعادة تعيين DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // إعادة تعيين localStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // إعادة تعيين URL
  window.history.pushState({}, '', '/');
  
  // إعادة تعيين RTL
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
});

afterEach(() => {
  // تنظيف بعد كل اختبار
  vi.clearAllTimers();
  vi.clearAllMocks();
});

// 🔧 Utilities مساعدة
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
};

export const mockIntersectionObserver = (isIntersecting: boolean = false) => {
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));
  
  // تشغيل callback فوراً إذا كان مطلوباً
  if (isIntersecting) {
    setTimeout(() => {
      const observer = global.IntersectionObserver.mock.results[0].value;
      if (observer.callback) {
        observer.callback([{
          isIntersecting: true,
          target: document.createElement('div'),
          intersectionRatio: 1,
          boundingClientRect: {},
          rootBounds: {},
          time: Date.now(),
        }], observer);
      }
    }, 0);
  }
};

export const mockScrollPosition = (scrollY: number = 0) => {
  Object.defineProperty(window, 'scrollY', {
    writable: true,
    value: scrollY,
  });
};

export const mockViewportSize = (width: number = 1024, height: number = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    value: height,
  });
};

// 🎯 إعدادات إضافية
export const setupTestEnvironment = () => {
  // إعداد بيئة الاختبار
  mockMatchMedia();
  mockResizeObserver();
  mockIntersectionObserver();
  mockViewportSize();
};

// 📊 إعدادات الأداء
export const performanceConfig = {
  // إعدادات للأداء الأفضل
  maxConcurrency: 4,
  pool: 'forks',
  isolate: false,
  restoreMocks: true,
  clearMocks: true,
  mockReset: true,
};

// 🔍 إعدادات التغطية
export const coverageConfig = {
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
  ],
  thresholds: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
