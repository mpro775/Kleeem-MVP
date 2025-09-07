import axios, { type AxiosResponse } from "axios";
import { API_BASE } from "../../context/config";
import { AppError, errorLogger } from "../errors";

/** مفاتيح شائعة للبيانات */
const DATA_KEYS = [
  "data",
  "result",
  "payload",
  "value",
  "item",
  "entry",
] as const;
const LIST_KEYS = ["items", "results", "rows", "list"] as const;
const META_KEYS = ["meta", "pagination", "pageInfo"] as const;

/** يلتقط معلومات ميتا شائعة (total / page / size ...) إن وُجدت */
function extractMeta(obj: any): Record<string, any> | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  // 1) حقول ميتا مباشرة
  for (const k of META_KEYS) {
    if (
      obj &&
      typeof obj === "object" &&
      k in obj &&
      typeof obj[k] === "object"
    ) {
      return obj[k];
    }
  }

  // 2) مجاميع شائعة مرافقة للقوائم
  const totalKeys = ["total", "count", "totalCount", "recordsTotal"];
  const pageKeys = ["page", "currentPage"];
  const sizeKeys = ["size", "pageSize", "limit", "perPage"];

  const meta: Record<string, any> = {};
  for (const tk of totalKeys) if (tk in obj) meta.total = obj[tk];
  for (const pk of pageKeys) if (pk in obj) meta.page = obj[pk];
  for (const sk of sizeKeys) if (sk in obj) meta.size = obj[sk];

  return Object.keys(meta).length ? meta : undefined;
}

/** يطبّع أي شكل رد إلى "payload" موحّد + "meta" إن وُجد */
function normalizePayload(raw: any): { payload: any; meta?: any } {
  // 204 أو لا شيء
  if (raw === undefined || raw === null) return { payload: raw };

  // إذا كانت مصفوفة أصلاً
  if (Array.isArray(raw)) return { payload: raw };

  // إذا كان Blob/Stream أو ملف، لا نلمسه
  if (typeof Blob !== "undefined" && raw instanceof Blob)
    return { payload: raw };
  if (typeof raw === "object" && ("arrayBuffer" in raw || "stream" in raw))
    return { payload: raw };

  // إذا كان كائن:
  if (typeof raw === "object") {
    // كثير من الـ APIs: { success, data, message }
    if ("data" in raw && raw.data !== undefined) {
      const meta = extractMeta(raw);
      return { payload: raw.data, meta };
    }

    // { items: [...], total, page, ... }
    for (const key of LIST_KEYS) {
      if (key in raw && Array.isArray((raw as any)[key])) {
        const meta = extractMeta(raw);
        return { payload: (raw as any)[key], meta };
      }
    }

    // { result } / { payload } / { value } / { item } ...
    for (const key of DATA_KEYS) {
      if (key in raw) {
        const meta = extractMeta(raw);
        return { payload: (raw as any)[key], meta };
      }
    }

    // لا توجد مفاتيح معروفة: نعيد الكائن كما هو
    const meta = extractMeta(raw);
    return { payload: raw, meta };
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
function collectConstraints(err: any, path = '') {
  const lines: string[] = [];
  const fields: Record<string, string[]> = {};
  const arr = Array.isArray(err) ? err : [err];

  const walk = (node: any, basePath: string) => {
    const prop = node?.property ? (basePath ? `${basePath}.${node.property}` : node.property) : basePath;
    if (node?.constraints && typeof node.constraints === 'object') {
      const msgs = Object.values(node.constraints).filter(Boolean) as string[];
      if (msgs.length) {
        if (prop) fields[prop] = (fields[prop] || []).concat(msgs);
        lines.push(...msgs);
      }
    }
    if (Array.isArray(node?.children) && node.children.length) {
      node.children.forEach((ch: any) => walk(ch, prop));
    }
  };

  for (const item of arr) {
    if (typeof item === 'string') lines.push(item);
    else if (item && typeof item === 'object') {
      if (typeof item.message === 'string') lines.push(item.message);
      walk(item, path);
    }
  }
  return { lines, fields };
}

function normalizeServerError(data: any, fallback = 'حدث خطأ غير متوقع') {
  if (typeof data?.message === 'string') {
    return { message: data.message as string, fields: undefined as Record<string, string[]> | undefined };
  }
  if (Array.isArray(data?.message)) {
    const { lines, fields } = collectConstraints(data.message);
    const message = lines.length ? lines.join(' • ') : 'بيانات غير صحيحة - يرجى مراجعة المدخلات';
    return { message, fields: Object.keys(fields).length ? fields : undefined };
  }
  if (typeof data?.error === 'string') return { message: data.error, fields: undefined };
  if (typeof data === 'string') return { message: data, fields: undefined };
  return { message: fallback, fields: undefined };
}

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: {
    Accept: "application/json, text/plain, */*",
  },
});

// قبل كل طلب: أضف التوكن لو وجد
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
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
    const headRequestId = err.response?.headers?.["x-request-id"];
    const bodyRequestId = data?.requestId;
    const requestId = bodyRequestId || headRequestId;
  
    const { message, fields } = normalizeServerError(
      data,
      err.message || "خطأ في الاتصال بالخادم"
    );
  
    const code =
      (typeof data?.code === 'string' && data.code) ||
      (status ? `API_${status}` : "NETWORK_ERROR");
  
    const appError = new AppError({
      message,           // دائماً string الآن
      status,
      code,
      requestId,
      fields,            // Record<string, string[]> | undefined
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
