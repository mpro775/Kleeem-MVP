import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

// Environment variable for API base URL
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// Meta for server response (optional)
type Meta = {
  success?: boolean;
  requestId?: string;
  timestamp?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  requestId?: string;
  timestamp?: string;
};

/** Normalizes the response from backend - { success, data, requestId, timestamp } */
function normalizePayload<T>(raw: unknown): { payload: T; meta?: Meta } {
  // Primitive/null/undefined → return as is
  if (raw === undefined || raw === null) return { payload: raw as T };

  // Array
  if (Array.isArray(raw)) return { payload: raw as unknown as T };

  // Blob/Stream
  if (typeof Blob !== 'undefined' && raw instanceof Blob)
    return { payload: raw as T };
  if (
    typeof raw === 'object' &&
    ('arrayBuffer' in (raw as object) || 'stream' in (raw as object))
  ) {
    return { payload: raw as T };
  }

  // Object containing the unified shape
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Partial<ApiEnvelope<T>> & Record<string, unknown>;
    if ('success' in obj && 'data' in obj) {
      return {
        payload: obj.data as T,
        meta: {
          success:
            typeof obj.success === 'boolean' ? obj.success : undefined,
          requestId:
            typeof obj.requestId === 'string' ? obj.requestId : undefined,
          timestamp:
            typeof obj.timestamp === 'string' ? obj.timestamp : undefined,
        },
      };
    }
    // fallback: return the object as is
    return { payload: raw as T };
  }

  // string/number/boolean
  return { payload: raw as T };
}

/** Adds helper fields without breaking the original Axios shape */
function attachNormalizedToResponse<T>(
  res: AxiosResponse<T>,
  normalized: { payload: T; meta?: Meta },
  rawData: unknown
): AxiosResponse<T> {
  // "Internal fields" non-standard — we add them gently
  (res as AxiosResponse<T> & { _raw?: unknown; _meta?: Meta })._raw = rawData;
  if (normalized.meta !== undefined) {
    (res as AxiosResponse<T> & { _meta?: Meta })._meta = normalized.meta;
  }
  // Write payload inside data
  Object.defineProperty(res, 'data', {
    value: normalized.payload,
    writable: true,
  });
  return res;
}

function normalizeServerError(
  data: unknown,
  fallback = 'حدث خطأ غير متوقع'
): { message: string; fields?: Record<string, string[]> } {
  if (!data || typeof data !== 'object') {
    return { message: fallback, fields: undefined };
  }
  const d = data as Record<string, unknown>;

  // Direct message
  if (typeof d.message === 'string') {
    return {
      message: d.message,
      fields: (d.details as Record<string, string[]>) || undefined,
    };
  }

  // Old fallback error
  if (typeof d.error === 'string') {
    return { message: d.error, fields: undefined };
  }

  // details (validation)
  if (d.details && typeof d.details === 'object') {
    const fields: Record<string, string[]> = {};
    for (const [field, err] of Object.entries(
      d.details as Record<string, unknown>
    )) {
      if (err && typeof err === 'object' && 'message' in (err as object)) {
        const msg = (err as { message?: string }).message;
        if (typeof msg === 'string') fields[field] = [msg];
      }
    }
    return {
      message:
        typeof d.message === 'string'
          ? d.message
          : 'بيانات غير صحيحة - يرجى مراجعة المدخلات',
      fields: Object.keys(fields).length ? fields : undefined,
    };
  }

  return { message: fallback, fields: undefined };
}

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Important for cookies
  headers: { Accept: 'application/json, text/plain, */*' },
});

// Before each request
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const rid =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    config.headers.set('X-Request-Id', rid);
    config.headers.set(
      'Accept-Language',
      typeof window !== 'undefined' ? navigator.language || 'ar' : 'ar'
    );
    config.headers.set('X-Client', 'kaleem-web-next');

    // Note: cookies are sent automatically with withCredentials: true
    // No need to manually add Authorization header - backend will use cookies

    // Idempotency for modifying routes
    const m = (config.method || 'get').toLowerCase();
    if (
      ['post', 'put', 'patch', 'delete'].includes(m) &&
      !config.headers.has('X-Idempotency-Key')
    ) {
      config.headers.set('X-Idempotency-Key', rid);
    }

    return config;
  }
);

// On response: res.data ← payload always
axiosInstance.interceptors.response.use(
  (res) => {
    try {
      const isBlob =
        res.request?.responseType === 'blob' ||
        (typeof Blob !== 'undefined' && res.data instanceof Blob);
      if (isBlob) return res;

      if (res.status === 204) {
        (
          res as AxiosResponse<unknown> & { _raw?: unknown; _meta?: Meta }
        )._raw = undefined;
        (res as AxiosResponse<unknown> & { _meta?: Meta })._meta = undefined;
        Object.defineProperty(res, 'data', {
          value: undefined,
          writable: true,
        });
        return res;
      }

      const raw = res.data as unknown;
      const normalized = normalizePayload<typeof res.data>(raw);
      return attachNormalizedToResponse(res, normalized, raw);
    } catch {
      return res;
    }
  },
  (err) => {
    // Handle 401 - redirect to login (cookies will be cleared by server)
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Check if we're not already on the login page to avoid redirect loop
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/ar/login';
      }
    }

    const status = err.response?.status as number | undefined;
    const data = err.response?.data as unknown;

    const headRequestId: string | undefined =
      (err.response?.headers?.['x-request-id'] as string | undefined) ||
      (err.response?.headers?.['X-Request-Id'] as string | undefined);

    const bodyRequestId: string | undefined =
      data && typeof data === 'object' && 'requestId' in data
        ? ((data as Record<string, string>).requestId as string)
        : undefined;

    const requestId = bodyRequestId || headRequestId;

    const { message, fields } = normalizeServerError(
      data,
      err.message || 'خطأ في الاتصال بالخادم'
    );

    const code =
      data && typeof data === 'object' && 'code' in data
        ? ((data as Record<string, string>).code as string)
        : status
          ? `API_${status}`
          : 'NETWORK_ERROR';

    // Create a custom error object
    const appError = {
      message,
      status,
      code,
      requestId,
      fields,
      url: err.config?.url,
      method: err.config?.method,
    };

    // Log error (можно интегрировать с Sentry здесь)
    console.error('[API Error]', appError);

    return Promise.reject(appError);
  }
);

export default axiosInstance;

