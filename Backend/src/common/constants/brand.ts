// src/common/constants/brand.ts
export const ALLOWED_DARK_BRANDS = [
  '#0b1220', '#111827', '#1f2937', '#1e1b4b', '#312e81',
  '#3b0764', '#3f1d2b', '#052e2b', '#064e3b', '#7f1d1d','#0b1f4b', // navy
'#134e4a', // teal من الفرونت
'#14532d', // forest
'#4a0e0e', // maroon
'#3e2723', // chocolate
] as const;
export type AllowedDarkBrand = typeof ALLOWED_DARK_BRANDS[number];

export const ALLOWED_DARK_SET = new Set(ALLOWED_DARK_BRANDS); // كلّها lowercase
export const toLowerHex = (v?: string) => (v || '').trim().toLowerCase();
