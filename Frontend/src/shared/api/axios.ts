import axios, { type AxiosResponse } from "axios";
import { API_BASE } from "../../context/config";
import { AppError, errorLogger } from "../errors";

/** يطبّع الاستجابة من الباك إند - الاستجابة دائماً بالصيغة { success, data, requestId, timestamp } */
function normalizePayload(raw: any): { payload: any; meta?: any } {
  // الباك إند يرسل دائماً { success: true, data: T, requestId, timestamp }
  // لا نحتاج للتطبيع المعقد

  if (raw === undefined || raw === null) return { payload: raw };

  // إذا كانت مصفوفة أصلاً (نادر لكن ممكن)
  if (Array.isArray(raw)) return { payload: raw };

  // إذا كان Blob/Stream أو ملف، لا نلمسه
  if (typeof Blob !== "undefined" && raw instanceof Blob)
    return { payload: raw };
  if (typeof raw === "object" && ("arrayBuffer" in raw || "stream" in raw))
    return { payload: raw };

  // إذا كان كائن:
  if (typeof raw === "object") {
    // الباك إند يرسل دائماً الصيغة الصحيحة
    if ("success" in raw && "data" in raw) {
      return {
        payload: raw.data,
        meta: {
          success: raw.success,
          requestId: raw.requestId,
          timestamp: raw.timestamp
        }
      };
    }

    // fallback للحالات النادرة
    return { payload: raw };
  }

  // بدائيات (string/number/bool) — نعيدها كما هي
  return { payload: raw };
}

/** يضيف حقول مساعدة بدون كسر شكل Axios الأصلي */
function attachNormalizedToResponse(
  res: AxiosResponse,
  normalized: { payload: any; meta?: any },
  rawData: any
) {
  // نحفظ الخام للوصول عند الحاجة
  (res as any)._raw = rawData;
  // نضيف الميتا إن وجدت
  if (normalized.meta !== undefined) (res as any)._meta = normalized.meta;
  // نكتب payload داخل data حتى كل الصفحات التي تستعمل res.data تعمل مباشرة
  (res as any).data = normalized.payload;
}
function normalizeServerError(data: any, fallback = "حدث خطأ غير متوقع") {
  // الباك إند يرسل أخطاء موحدة بالصيغة: { status, code, message, requestId, timestamp, details? }

  if (!data || typeof data !== "object") {
    return {
      message: fallback,
      fields: undefined as Record<string, string[]> | undefined,
    };
  }

  // إذا كان هناك message مباشرة (fallback للحالات القديمة)
  if (typeof data.message === "string") {
    return {
      message: data.message,
      fields: data.details as Record<string, string[]> | undefined,
    };
  }

  // إذا كان هناك error (fallback للحالات القديمة)
  if (typeof data.error === "string") {
    return {
      message: data.error,
      fields: undefined
    };
  }

  // إذا كان هناك details مع validation errors
  if (data.details && typeof data.details === "object") {
    const fields: Record<string, string[]> = {};

    // معالجة أخطاء MongoDB validation
    if (typeof data.details === "object") {
      for (const [field, error] of Object.entries(data.details)) {
        if (typeof error === "object" && error && "message" in error) {
          fields[field] = [(error as { message: string }).message];
        }
      }
    }

    return {
      message: data.message || "بيانات غير صحيحة - يرجى مراجعة المدخلات",
      fields: Object.keys(fields).length ? fields : undefined,
    };
  }

  // fallback
  return {
    message: fallback,
    fields: undefined
  };
}

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: { Accept: "application/json, text/plain, */*" },
});

// قبل كل طلب: أضف التوكن لو وجد
axiosInstance.interceptors.request.use((config) => {
  // Request ID موحّد (لو الفرونت يرسل واحد، الباك إما يقبله أو ينشئ بديل)
  const rid =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  config.headers.set("X-Request-Id", rid);
  config.headers.set("Accept-Language", navigator.language || "ar");
  config.headers.set("X-Client", "kaleem-web");

  // ⛔️ لا تضع withCredentials هنا؛ نحن على Bearer
  const token = localStorage.getItem("token");
  if (token) config.headers.set("Authorization", `Bearer ${token}`);

  // ☂️ Idempotency للمسارات المعدِّلة
  const m = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(m)) {
    if (!config.headers.has("X-Idempotency-Key")) {
      config.headers.set("X-Idempotency-Key", rid);
    }
  }

  return config;
});

// عند الاستجابة: طبّع كل الأشكال إلى res.data موحّدة + _meta/_raw
axiosInstance.interceptors.response.use(
  (res) => {
    try {
      // لا نطبع/نطبع blobs/files
      const isBlob =
        res.request?.responseType === "blob" || res.data instanceof Blob;
      if (isBlob) return res;

      // 204 No Content → data تبقى undefined
      if (res.status === 204) {
        (res as any)._raw = undefined;
        (res as any)._meta = undefined;
        (res as any).data = undefined;
        return res;
      }

      const raw = res.data;
      const normalized = normalizePayload(raw);
      attachNormalizedToResponse(res, normalized, raw);
      return res;
    } catch {
      // أي خطأ في التطبيع: لا تكسر الاستجابة
      return res;
    }
  },
  (err) => {
    const token = localStorage.getItem("token");

    if (err.response?.status === 401 && token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    const status = err.response?.status as number | undefined;
    const data = err.response?.data;

    // الباك إند يرسل الأخطاء موحدة: { status, code, message, requestId, timestamp, details? }
    // نحن نحصل على requestId من header أو من body
    const headRequestId = err.response?.headers?.["X-Request-Id"];
    const bodyRequestId = data?.requestId;
    const requestId = bodyRequestId || headRequestId;

    const { message, fields } = normalizeServerError(
      data,
      err.message || "خطأ في الاتصال بالخادم"
    );

    // code تأتي مباشرة من الباك إند، أو نستخدم API_{status} كfallback
    const code =
      (typeof data?.code === "string" && data.code) ||
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
