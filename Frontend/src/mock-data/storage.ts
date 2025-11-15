/**
 * LocalStorage persistence utilities for demo mode
 * يحفظ جميع التغييرات في LocalStorage لمحاكاة حقيقية
 */

const STORAGE_PREFIX = "demo_";

export const StorageKeys = {
  CONVERSATIONS: `${STORAGE_PREFIX}conversations`,
  LINKS: `${STORAGE_PREFIX}links`,
  FAQS: `${STORAGE_PREFIX}faqs`,
  INSTRUCTIONS: `${STORAGE_PREFIX}instructions`,
  MISSING_RESPONSES: `${STORAGE_PREFIX}missing_responses`,
  PRODUCTS: `${STORAGE_PREFIX}products`,
  ORDERS: `${STORAGE_PREFIX}orders`,
  CATEGORIES: `${STORAGE_PREFIX}categories`,
  COUPONS: `${STORAGE_PREFIX}coupons`,
  STOREFRONT_THEME: `${STORAGE_PREFIX}storefront_theme`,
} as const;

/**
 * حفظ Map في LocalStorage
 */
export function saveMapToStorage<T>(key: string, map: Map<string, T>): void {
  try {
    const entries = Array.from(map.entries());
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (error) {
    console.warn(`[DEMO STORAGE] Failed to save ${key}:`, error);
  }
}

/**
 * تحميل Map من LocalStorage
 */
export function loadMapFromStorage<T>(key: string): Map<string, T> {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return new Map();
    
    const entries = JSON.parse(stored) as Array<[string, T]>;
    return new Map(entries);
  } catch (error) {
    console.warn(`[DEMO STORAGE] Failed to load ${key}:`, error);
    return new Map();
  }
}

/**
 * حفظ Array في LocalStorage
 */
export function saveArrayToStorage<T>(key: string, array: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(array));
  } catch (error) {
    console.warn(`[DEMO STORAGE] Failed to save ${key}:`, error);
  }
}

/**
 * تحميل Array من LocalStorage
 */
export function loadArrayFromStorage<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    return JSON.parse(stored) as T[];
  } catch (error) {
    console.warn(`[DEMO STORAGE] Failed to load ${key}:`, error);
    return [];
  }
}

/**
 * حذف مفتاح من LocalStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[DEMO STORAGE] Failed to remove ${key}:`, error);
  }
}

/**
 * مسح جميع بيانات الديمو من LocalStorage
 */
export function clearDemoStorage(): void {
  Object.values(StorageKeys).forEach((key) => {
    removeFromStorage(key);
  });
}

