// =========================
// File: src/shared/api/axios.ts
// =========================
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { API_BASE } from "../../context/config";
import { AppError, errorLogger } from "../errors";
import { isObj, type ApiEnvelope } from "@/shared/types/api";
import { isMockDataEnabled } from "@/mock-data";

// Meta لرد السيرفر (اختيارية)
type Meta = {
  success?: boolean;
  requestId?: string;
  timestamp?: string;
};

/** يطبّع الاستجابة من الباك إند - { success, data, requestId, timestamp } */
function normalizePayload<T>(raw: unknown): { payload: T; meta?: Meta } {
  // بدائي/null/undefined → نعيد كما هو
  if (raw === undefined || raw === null) return { payload: raw as T };

  // Array
  if (Array.isArray(raw)) return { payload: raw as unknown as T };

  // Blob/Stream
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Blob قد لا يكون معرّفًا بيئيًا (SSR)
  if (typeof Blob !== "undefined" && raw instanceof Blob) return { payload: raw as T };
  if (typeof raw === "object" && ("arrayBuffer" in (raw as object) || "stream" in (raw as object))) {
    return { payload: raw as T };
  }

  // Object يحوي الشكل الموحّد
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Partial<ApiEnvelope<T>> & Record<string, unknown>;
    if ("success" in obj && "data" in obj) {
      return {
        payload: obj.data as T,
        meta: {
          success: typeof obj.success === "boolean" ? obj.success : undefined,
          requestId: typeof obj.requestId === "string" ? obj.requestId : undefined,
          timestamp: typeof obj.timestamp === "string" ? obj.timestamp : undefined,
        },
      };
    }
    // fallback: أعِد الكائن كما هو
    return { payload: raw as T };
  }

  // string/number/boolean
  return { payload: raw as T };
}

/** يضيف حقول مساعدة بدون كسر شكل Axios الأصلي */
function attachNormalizedToResponse<T>(
  res: AxiosResponse<T>,
  normalized: { payload: T; meta?: Meta },
  rawData: unknown
): AxiosResponse<T> {
  // “حقول داخلية” غير نمطية — نضيفها برفق
  (res as AxiosResponse<T> & { _raw?: unknown; _meta?: Meta })._raw = rawData;
  if (normalized.meta !== undefined) {
    (res as AxiosResponse<T> & { _meta?: Meta })._meta = normalized.meta;
  }
  // نكتب payload داخل data
  Object.defineProperty(res, "data", { value: normalized.payload, writable: true });
  return res;
}

function normalizeServerError(
  data: unknown,
  fallback = "حدث خطأ غير متوقع"
): { message: string; fields?: Record<string, string[]> } {
  if (!data || typeof data !== "object") {
    return { message: fallback, fields: undefined };
  }
  const d = data as Record<string, unknown>;

  // message مباشرة
  if (typeof d.message === "string") {
    return {
      message: d.message,
      fields: (d.details as Record<string, string[]>) || undefined,
    };
  }

  // error fallback قديم
  if (typeof d.error === "string") {
    return { message: d.error, fields: undefined };
  }

  // details (validation)
  if (d.details && typeof d.details === "object") {
    const fields: Record<string, string[]> = {};
    for (const [field, err] of Object.entries(d.details as Record<string, unknown>)) {
      if (err && typeof err === "object" && "message" in (err as object)) {
        const msg = (err as { message?: string }).message;
        if (typeof msg === "string") fields[field] = [msg];
      }
    }
    return {
      message: typeof d.message === "string" ? d.message : "بيانات غير صحيحة - يرجى مراجعة المدخلات",
      fields: Object.keys(fields).length ? fields : undefined,
    };
  }

  return { message: fallback, fields: undefined };
}

// في وضع الديمو، استخدم relative URL حتى يعمل MSW بشكل صحيح
const getBaseURL = (): string => {
  if (isMockDataEnabled()) {
    return "/api";
  }
  return API_BASE;
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { Accept: "application/json, text/plain, */*" },
});

let csrfToken: string | null = null;

// قبل كل طلب
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // تحديث baseURL ديناميكياً في وضع الديمو
  if (isMockDataEnabled()) {
    config.baseURL = "/api";
  } else {
    config.baseURL = API_BASE;
  }

  const rid =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  config.headers.set("X-Request-Id", rid);
  config.headers.set("Accept-Language", navigator.language || "ar");
  config.headers.set("X-Client", "kaleem-web");

  // Bearer
  const token = localStorage.getItem("token");
  if (token) config.headers.set("Authorization", `Bearer ${token}`);

  // CSRF
  if (csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }

  // Idempotency للمسارات المعدِّلة
  const m = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(m) && !config.headers.has("X-Idempotency-Key")) {
    config.headers.set("X-Idempotency-Key", rid);
  }

  return config;
});

// عند الاستجابة: res.data ← payload دائمًا
axiosInstance.interceptors.response.use(
  (res) => {
    // التقاط CSRF token من الرأس
    const headerToken =
      (res.headers["x-csrf-token"] as string | undefined) ||
      (res.headers["X-CSRF-Token"] as string | undefined);

    if (headerToken) {
      csrfToken = headerToken;
    }

    try {
      const isBlob =
        (res.request?.responseType === "blob") ||
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (typeof Blob !== "undefined" && res.data instanceof Blob);
      if (isBlob) return res;

      if (res.status === 204) {
        (res as AxiosResponse<unknown> & { _raw?: unknown; _meta?: Meta })._raw = undefined;
        (res as AxiosResponse<unknown> & { _meta?: Meta })._meta = undefined;
        Object.defineProperty(res, "data", { value: undefined, writable: true });
        return res;
      }

      const raw = res.data as unknown;
      // نستخدم النوع العام T إن تم تحديده في get<T>
      const normalized = normalizePayload<typeof res.data>(raw);
      return attachNormalizedToResponse(res, normalized, raw);
    } catch {
      return res;
    }
  },
  async (err) => {
    const originalRequest = err.config;

    // Prevent infinite loops: don't retry refresh or if already retried
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');
    const alreadyRetried = originalRequest?._retry;

    // Try to refresh token on 401 (unless it's the refresh endpoint itself)
    if (err.response?.status === 401 && !isRefreshRequest && !alreadyRetried) {
      const token = localStorage.getItem("token");

      if (token) {
        originalRequest._retry = true;

        try {
          // Try to refresh the token
          const refreshResponse = await axiosInstance.post(`${API_BASE}/auth/refresh`, {});
          const newToken = refreshResponse.data?.accessToken;

          if (newToken) {
            // Store new token
            localStorage.setItem("token", newToken);

            // Update user if provided
            if (refreshResponse.data?.user) {
              localStorage.setItem("user", JSON.stringify(refreshResponse.data.user));
            }

            // 👇 Inform AuthContext about the refresh
            window.dispatchEvent(
              new CustomEvent("auth:token-refreshed", {
                detail: {
                  token: newToken,
                  user: refreshResponse.data?.user,
                },
              })
            );

            // Update headers and retry
            axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
            originalRequest.headers.set("Authorization", `Bearer ${newToken}`);

            return axiosInstance(originalRequest);
          }
        } catch {
          // Refresh failed - logout user
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(err);
        }
      }

      // No token or refresh failed - logout
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(err);
    }

    const status = err.response?.status as number | undefined;
    const data = err.response?.data as unknown;

    // رؤوس Axios تكون lower-case عادةً
    const headRequestId: string | undefined =
      (err.response?.headers?.["x-request-id"] as string | undefined) ||
      (err.response?.headers?.["X-Request-Id"] as string | undefined);

    const bodyRequestId: string | undefined =
      (isObj(data) && typeof (data as Record<string, unknown>).requestId === "string")
        ? ((data as Record<string, string>).requestId)
        : undefined;

    const requestId = bodyRequestId || headRequestId;

    const { message, fields } = normalizeServerError(
      data,
      err.message || "خطأ في الاتصال بالخادم"
    );

    const code =
      (isObj(data) && typeof (data as Record<string, unknown>).code === "string"
        ? ((data as Record<string, string>).code)
        : undefined) ||
      (status ? `API_${status}` : "NETWORK_ERROR");

    const appError = new AppError({
      message,
      status,
      code,
      requestId,
      fields,
    });

    errorLogger.log(appError, {
      url: err.config?.url,
      method: err.config?.method,
      requestData: err.config?.data,
      responseData: data,
    });

    return Promise.reject(appError);
  }
);


export default axiosInstance;
