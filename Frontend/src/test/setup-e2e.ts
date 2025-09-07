import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 🎭 إعدادات اختبارات E2E - Kaleem Frontend

// 🔧 Mock للـ console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // إيقاف console.error و console.warn في اختبارات E2E
  console.error = vi.fn();
  console.warn = vi.fn();
  
  // إعداد JSDOM لاختبارات E2E
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
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
  
  // Mock للـ fetch API
  global.fetch = vi.fn();
  
  // Mock للـ localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  
  // Mock للـ sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
  
  // Mock للـ URL API
  Object.defineProperty(window, 'URL', {
    value: {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    },
    writable: true,
  });
  
  // Mock للـ FileReader
  global.FileReader = vi.fn().mockImplementation(() => ({
    readAsText: vi.fn(),
    readAsDataURL: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    onload: null,
    onerror: null,
    result: null,
  })) as any;
  
  // Add static properties to FileReader
  (global.FileReader as any).EMPTY = 0;
  (global.FileReader as any).LOADING = 1;
  (global.FileReader as any).DONE = 2;
  
  // Mock للـ FormData
  global.FormData = vi.fn().mockImplementation(() => ({
    append: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    set: vi.fn(),
    forEach: vi.fn(),
    entries: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
  }));
  
  // Mock للـ Headers
  global.Headers = vi.fn().mockImplementation(() => ({
    append: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    set: vi.fn(),
    forEach: vi.fn(),
    entries: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
  }));
  
  // Mock للـ Request
  global.Request = vi.fn().mockImplementation(() => ({
    url: 'http://localhost:3000',
    method: 'GET',
    headers: new Headers(),
    body: null,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
  }));
  
  // Mock للـ Response
  global.Response = vi.fn().mockImplementation(() => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    body: null,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
  })) as any;
  
  // Add static methods to Response
  (global.Response as any).error = vi.fn(() => new Response());
  (global.Response as any).json = vi.fn((data: any) => new Response(JSON.stringify(data)));
  (global.Response as any).redirect = vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } }));
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
  
  // إعادة تعيين fetch mock
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
});

afterEach(() => {
  // تنظيف بعد كل اختبار
  vi.clearAllTimers();
  vi.clearAllMocks();
});

// 🔧 Utilities مساعدة لاختبارات E2E
export const mockFetchResponse = (data: any, status: number = 200) => {
  if (global.fetch) {
    (global.fetch as any).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers(),
    });
  }
};

export const mockFetchError = (error: string, status: number = 500) => {
  if (global.fetch) {
    (global.fetch as any).mockRejectedValue(new Error(error));
  }
};

export const mockLocalStorage = (data: Record<string, string>) => {
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};

export const mockSessionStorage = (data: Record<string, string>) => {
  Object.entries(data).forEach(([key, value]) => {
    sessionStorage.setItem(key, value);
  });
};

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
      const observer = (global.IntersectionObserver as any).mock.results[0].value;
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

// 🎯 إعدادات إضافية لاختبارات E2E
export const setupE2ETestEnvironment = () => {
  // إعداد بيئة اختبارات E2E
  mockMatchMedia();
  mockResizeObserver();
  mockIntersectionObserver();
  mockViewportSize();
  mockFetchResponse({});
};

// 📊 إعدادات الأداء لاختبارات E2E
export const e2ePerformanceConfig = {
  // إعدادات للأداء الأفضل في اختبارات E2E
  maxConcurrency: 1,
  pool: 'forks',
  isolate: true,
  restoreMocks: true,
  clearMocks: true,
  mockReset: true,
  testTimeout: 60000,
  hookTimeout: 30000,
  teardownTimeout: 20000,
};

// 🔍 إعدادات التغطية لاختبارات E2E
export const e2eCoverageConfig = {
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
    '**/*.e2e.*',
  ],
  thresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
