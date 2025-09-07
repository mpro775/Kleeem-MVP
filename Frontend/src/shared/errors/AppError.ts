// src/shared/errors/AppError.ts
export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
  fields?: FieldErrors;

  constructor(init: Partial<AppError> & { message: string }) {
    super(init.message);
    Object.setPrototypeOf(this, AppError.prototype);
    Object.assign(this, init);
  }
}

// خريطة رسائل افتراضية شاملة (اربطها لاحقًا بـ i18n)
export const ERROR_MESSAGES: Record<string, string> = {
  // أخطاء الشبكة
  NETWORK_ERROR: "خطأ في الاتصال بالشبكة - يرجى التحقق من اتصالك بالإنترنت",
  OFFLINE_ERROR: "أنت غير متصل بالإنترنت - يرجى التحقق من اتصالك",
  TIMEOUT_ERROR: "انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى",
  
  // أخطاء API
  API_400: "بيانات غير صحيحة - يرجى مراجعة المدخلات",
  API_401: "غير مصرح لك بالوصول - يرجى تسجيل الدخول مرة أخرى",
  API_403: "غير مسموح لك بهذا الإجراء - لا تملك الصلاحيات المطلوبة",
  API_404: "المورد المطلوب غير موجود",
  API_409: "تعارض في البيانات - يرجى المحاولة مرة أخرى",
  API_422: "بيانات غير صالحة - يرجى مراجعة المدخلات",
  API_429: "تم تجاوز الحد المسموح - يرجى المحاولة لاحقاً",
  API_500: "خطأ في الخادم - يرجى المحاولة لاحقاً",
  API_502: "خطأ في الخادم - يرجى المحاولة لاحقاً",
  API_503: "الخدمة غير متوفرة حالياً - يرجى المحاولة لاحقاً",
  API_504: "انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى",
  
  // أخطاء المصادقة
  AUTH_INVALID_CREDENTIALS: "بيانات الدخول غير صحيحة",
  AUTH_TOKEN_EXPIRED: "انتهت صلاحية الجلسة - يرجى تسجيل الدخول مرة أخرى",
  AUTH_INSUFFICIENT_PERMISSIONS: "لا تملك الصلاحيات المطلوبة",
  UNAUTHORIZED: "الرجاء تسجيل الدخول أولاً",
  FORBIDDEN: "ليست لديك صلاحية لتنفيذ هذه العملية",
  
  // أخطاء النماذج
  VALIDATION_ERROR: "تحقق من الحقول المطلوبة",
  FORM_VALIDATION_ERROR: "يرجى مراجعة البيانات المدخلة",
  FORM_REQUIRED_FIELD: "هذا الحقل مطلوب",
  FORM_INVALID_EMAIL: "البريد الإلكتروني غير صحيح",
  FORM_PASSWORD_TOO_WEAK: "كلمة المرور ضعيفة جداً",
  FORM_PASSWORDS_DONT_MATCH: "كلمات المرور غير متطابقة",
  
  // أخطاء الملفات
  FILE_TOO_LARGE: "حجم الملف كبير جداً",
  FILE_INVALID_TYPE: "نوع الملف غير مدعوم",
  FILE_UPLOAD_FAILED: "فشل في رفع الملف",
  
  // أخطاء المنتجات
  PRODUCT_NOT_FOUND: "المنتج غير موجود",
  PRODUCT_OUT_OF_STOCK: "المنتج نفذ من المخزون",
  OUT_OF_STOCK: "المنتج غير متوفر حاليًا",
  PRODUCT_PRICE_CHANGED: "سعر المنتج تغير",
  
  // أخطاء الطلبات
  ORDER_NOT_FOUND: "الطلب غير موجود",
  ORDER_CANNOT_CANCEL: "لا يمكن إلغاء الطلب",
  ORDER_ALREADY_PAID: "الطلب مدفوع بالفعل",
  NOT_FOUND: "العنصر المطلوب غير موجود",
  
  // أخطاء المحادثات
  CHAT_SESSION_EXPIRED: "انتهت صلاحية جلسة المحادثة",
  CHAT_MESSAGE_TOO_LONG: "الرسالة طويلة جداً",
  CHAT_RATE_LIMIT: "تم تجاوز حد الرسائل - يرجى الانتظار",
  RATE_LIMITED: "عدد محاولات مرتفع، حاول لاحقًا",
  
  // أخطاء عامة
  UNKNOWN_ERROR: "حدث خطأ غير متوقع - يرجى المحاولة مرة أخرى",
  INTERNAL_ERROR: "حدث خطأ غير متوقع",
  SERVER_MAINTENANCE: "الخادم في صيانة - يرجى المحاولة لاحقاً",
  FEATURE_NOT_AVAILABLE: "هذه الميزة غير متوفرة حالياً",
};
