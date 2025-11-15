// test/e2e.setup.ts (مثال لمسار الملف)
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
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null as unknown,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock للـ IntersectionObserver
  class IOStub implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(_: IntersectionObserverCallback) {}
    disconnect(): void {}
    observe(_: Element): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve(_: Element): void {}
  }
  // @ts-expect-error: jsdom lacks IntersectionObserver
  global.IntersectionObserver = IOStub;

  // Mock للـ ResizeObserver
  class ROStub implements ResizeObserver {
    observe(_: Element): void {}
    unobserve(_: Element): void {}
    disconnect(): void {}
  }
  // @ts-expect-error: jsdom lacks ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => new ROStub());

  // Mock للـ window.scrollTo
  Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });

  // Mock للـ window.scrollY
  Object.defineProperty(window, 'scrollY', { writable: true, value: 0 });

  // Mock للـ window.innerHeight/innerWidth
  Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
  Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });

  // Mock للـ HTMLElement.prototype.clientWidth/Height
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });

  // Mock للـ Element.prototype.scrollTo/scrollIntoView/getBoundingClientRect
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0,
    toJSON: () => undefined,
  } as DOMRect));

  // Mock للـ fetch API
  type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  global.fetch = vi.fn<Parameters<FetchFn>, ReturnType<FetchFn>>();

  // Mock للـ localStorage/sessionStorage
  const localStorageMock: Storage = {
    getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
    key: vi.fn(), length: 0,
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

  const sessionStorageMock: Storage = {
    getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
    key: vi.fn(), length: 0,
  };
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

  // Mock للـ URL API (الجزء المستخدم لدينا فقط)
  Object.defineProperty(window, 'URL', {
    value: {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    },
    writable: true,
  });

  // Mock للـ FileReader
  // @ts-expect-error: تخصيص بسيط لمُنشئ FileReader داخل بيئة الاختبار
  global.FileReader = vi.fn().mockImplementation(() => ({
    readAsText: vi.fn(), readAsDataURL: vi.fn(), readAsArrayBuffer: vi.fn(),
    onload: null, onerror: null, result: null,
  })) as unknown as { new(): FileReader };

  // إضافة ثوابت ساكنة بدون استخدام any
  Object.assign(global.FileReader, { EMPTY: 0, LOADING: 1, DONE: 2 });

  // Mock للـ FormData / Headers
  // @ts-expect-error: jsdom يتيح التخصيص
  global.FormData = vi.fn().mockImplementation(() => ({
    append: vi.fn(), delete: vi.fn(), get: vi.fn(), getAll: vi.fn(),
    has: vi.fn(), set: vi.fn(), forEach: vi.fn(), entries: vi.fn(),
    keys: vi.fn(), values: vi.fn(),
  }));

  // @ts-expect-error: jsdom يتيح التخصيص
  global.Headers = vi.fn().mockImplementation(() => ({
    append: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn(),
    forEach: vi.fn(), entries: vi.fn(), keys: vi.fn(), values: vi.fn(),
  }));

  // Mock للـ Request
  // @ts-expect-error: تخصيص للبيئة الاختبارية
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
  })) as unknown as typeof Request;

  // Mock للـ Response (instance + static methods) بدون any
  const responseInstance: Partial<Response> = {
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
    json: vi.fn(async () => ({})),
    text: vi.fn(async () => '{}'),
  };

  const ResponseCtor = vi.fn(() => responseInstance as Response) as unknown as typeof Response;
  // @ts-expect-error: jsdom يتيح استبدال الـ Response
  global.Response = ResponseCtor;

  Object.defineProperties(global.Response, {
    error:   { value: vi.fn(() => new (global.Response as unknown as { new(): Response })()) },
    json:    { value: vi.fn((data: unknown) => new (global.Response as unknown as { new(): Response })()) },
    redirect:{ value: vi.fn((url: string) => new (global.Response as unknown as { new(): Response })()) },
  });
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

  // إعادة تعيين التخزين
  localStorage.clear();
  sessionStorage.clear();

  // إعادة تعيين URL
  window.history.pushState({}, '', '/');

  // RTL افتراضي
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');

  // إعادة تعيين fetch mock
  const f = global.fetch as unknown as vi.Mock;
  if (typeof f?.mockClear === 'function') f.mockClear();
});

afterEach(() => {
  // تنظيف بعد كل اختبار
  vi.clearAllTimers();
  vi.clearAllMocks();
});

// 🔧 Utilities مساعدة لاختبارات E2E

export function mockFetchResponse<T = unknown>(data: T, status = 200): void {
  const f = global.fetch as unknown as vi.Mock;
  f.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response);
}

export function mockFetchError(errorMessage: string, status = 500): void {
  const f = global.fetch as unknown as vi.Mock;
  // نعيد رفض الوعد بخطأ، ويمكنك الاستفادة من status داخل اختباراتك حسب الحاجة
  f.mockRejectedValue(Object.assign(new Error(errorMessage), { status }));
}

export function mockLocalStorage(data: Record<string, string>): void {
  Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, value));
}

export function mockSessionStorage(data: Record<string, string>): void {
  Object.entries(data).forEach(([key, value]) => sessionStorage.setItem(key, value));
}

export function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null as unknown,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

export function mockResizeObserver(): void {
  class ROStub implements ResizeObserver {
    observe(_: Element): void {}
    unobserve(_: Element): void {}
    disconnect(): void {}
  }
  global.ResizeObserver = vi.fn().mockImplementation(() => new ROStub());
}

export function mockIntersectionObserver(): void {
  class IOStub implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(_: IntersectionObserverCallback) {}
    disconnect(): void {}
    observe(_: Element): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve(_: Element): void {}
  }
  global.IntersectionObserver = IOStub;
}

export function mockScrollPosition(scrollY = 0): void {
  Object.defineProperty(window, 'scrollY', { writable: true, value: scrollY });
}

export function mockViewportSize(width = 1024, height = 768): void {
  Object.defineProperty(window, 'innerWidth', { writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, value: height });
}

// 🎯 إعدادات إضافية لاختبارات E2E
export function setupE2ETestEnvironment(): void {
  mockMatchMedia();
  mockResizeObserver();
  mockIntersectionObserver();
  mockViewportSize();
  mockFetchResponse({});
}

// 📊 إعدادات الأداء لاختبارات E2E
export const e2ePerformanceConfig = {
  maxConcurrency: 1,
  pool: 'forks' as const,
  isolate: true,
  restoreMocks: true,
  clearMocks: true,
  mockReset: true,
  testTimeout: 60_000,
  hookTimeout: 30_000,
  teardownTimeout: 20_000,
};

// 🔍 إعدادات التغطية لاختبارات E2E
export const e2eCoverageConfig = {
  provider: 'v8',
  reporter: ['text', 'json', 'html'] as const,
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
    global: { branches: 60, functions: 60, lines: 60, statements: 60 },
  },
};
