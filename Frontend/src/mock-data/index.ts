// ملف رئيسي لإدارة نظام البيانات الوهمية
import { startDemoServer, stopDemoServer, resetDemoServer } from "./demo-server";

const MOCK_DATA_STORAGE_KEY = "kaleem_use_mock_data";
const ENV_KEY = "VITE_USE_MOCK_DATA";

/**
 * التحقق من تفعيل البيانات الوهمية
 */
export function isMockDataEnabled(): boolean {
  // 1. التحقق من متغير البيئة
  const envEnabled = import.meta.env[ENV_KEY] === "true";

  // 2. التحقق من localStorage
  const storageEnabled = localStorage.getItem(MOCK_DATA_STORAGE_KEY) === "true";

  return envEnabled || storageEnabled;
}

/**
 * تفعيل البيانات الوهمية
 */
export async function enableMockData(): Promise<void> {
  localStorage.setItem(MOCK_DATA_STORAGE_KEY, "true");
  await startDemoServer();
}

/**
 * إلغاء تفعيل البيانات الوهمية
 */
export function disableMockData(): void {
  localStorage.setItem(MOCK_DATA_STORAGE_KEY, "false");
  stopDemoServer();
}

/**
 * التبديل بين تفعيل وإلغاء تفعيل البيانات الوهمية
 */
export async function toggleMockData(): Promise<boolean> {
  const currentState = isMockDataEnabled();
  if (currentState) {
    disableMockData();
    return false;
  } else {
    await enableMockData();
    return true;
  }
}

/**
 * تهيئة النظام - يتم استدعاؤها عند بدء التطبيق
 */
export async function initializeMockData(): Promise<void> {
  const enabled = isMockDataEnabled();
  console.log(`[Mock Data] Initialization check: ${enabled ? "ENABLED" : "DISABLED"}`);
  console.log(`[Mock Data] ENV VITE_USE_MOCK_DATA: ${import.meta.env.VITE_USE_MOCK_DATA}`);
  console.log(`[Mock Data] localStorage: ${localStorage.getItem(MOCK_DATA_STORAGE_KEY)}`);
  
  if (enabled) {
    try {
      await startDemoServer();
      console.log("[Mock Data] ✅ Successfully initialized");
    } catch (error) {
      console.error("[Mock Data] ❌ Failed to initialize:", error);
    }
  } else {
    console.log("[Mock Data] Skipping initialization - mock data disabled");
  }
}

/**
 * إعادة تعيين الخادم (مفيد بعد تغيير البيانات)
 */
export function resetMockData(): void {
  resetDemoServer();
}

// تصدير الخادم للاستخدام المباشر إذا لزم الأمر
export { demoServer, startDemoServer, stopDemoServer, resetDemoServer } from "./demo-server";

