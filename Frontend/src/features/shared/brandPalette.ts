// src/features/shared/brandPalette.ts
export type BrandKey =
  | "slate"
  | "charcoal"
  | "navy"
  | "indigo"
  | "indigo800"
  | "purple"
  | "teal"
  | "emerald"
  | "forest"
  | "maroon"
  | "chocolate"
  | "midnight"
  | "plum"
  | "deepTeal"
  | "crimson";

export const BRANDS: Record<
  BrandKey,
  { name: string; hex: string; hover: string }
> = {
  // موجودة أصلًا
  slate: { name: "سلايت", hex: "#111827", hover: "#0b1220" },
  charcoal: { name: "فحمي", hex: "#1f2937", hover: "#111827" },
  navy: { name: "كحلي", hex: "#0b1f4b", hover: "#08183a" },
  indigo: { name: "نيلي", hex: "#1e1b4b", hover: "#151338" },
  purple: { name: "بنفسجي داكن", hex: "#3b0764", hover: "#2a0547" },
  teal: { name: "تيل داكن", hex: "#134e4a", hover: "#0f3f3c" },
  emerald: { name: "زمردي داكن", hex: "#064e3b", hover: "#053c2e" },
  forest: { name: "أخضر غابة", hex: "#14532d", hover: "#0f3e22" },
  maroon: { name: "خمري", hex: "#4a0e0e", hover: "#3a0b0b" },
  chocolate: { name: "شوكولا داكن", hex: "#3e2723", hover: "#2e1d1a" },

  // جديدة لتطابق قائمة الباك بالضبط
  midnight: { name: "ليلي داكن", hex: "#0b1220", hover: "#070e19" },
  indigo800: { name: "نيلي 800", hex: "#312e81", hover: "#262366" },
  plum: { name: "برغندي بني", hex: "#3f1d2b", hover: "#311724" },
  deepTeal: { name: "تيل عميق", hex: "#052e2b", hover: "#041f21" },
  crimson: { name: "قرمزي داكن", hex: "#7f1d1d", hover: "#611616" },
};

export const ALLOWED_HEX = new Set(
  Object.values(BRANDS).map((b) => b.hex.toLowerCase())
);

export function findBrandByHex(hex?: string) {
  if (!hex) return null;
  const key = (Object.keys(BRANDS) as BrandKey[]).find(
    (k) => BRANDS[k].hex.toLowerCase() === hex.toLowerCase()
  );
  return key ? BRANDS[key] : null;
}

/** يضمن أن الهكس ضمن الألوان المعتمدة، وإلا يرجّع الافتراضي الداكن */
export function ensureAllowedBrandHex(hex?: string) {
  if (!hex) return "#111827";
  
  const normalized = hex.trim().toLowerCase();
  const withHash = normalized.startsWith("#") ? normalized : `#${normalized}`;
  
  // إذا كان اللون في القائمة المسموحة، استخدمه
  if (ALLOWED_HEX.has(withHash)) return withHash;
  
  // التحقق من أن اللون هو hex صالح (6 أرقام hex)
  const hexWithoutHash = withHash.slice(1);
  const isValidHex = /^[0-9a-f]{6}$/i.test(hexWithoutHash);
  
  // إذا كان اللون hex صالح، استخدمه مباشرة (يسمح بألوان مخصصة من storefront)
  if (isValidHex) {
    console.log("[brandPalette] Using custom brand color:", withHash);
    return withHash;
  }
  
  // Fallback إلى اللون الافتراضي
  console.warn("[brandPalette] Invalid brand color, using default:", hex);
  return "#111827";
}

export function applyBrandCssVars(hex: string) {
  const b = findBrandByHex(hex);
  const brand = b?.hex ?? hex; // استخدام hex الممرر مباشرة إذا لم يكن في القائمة
  // حساب hover color تلقائياً إذا لم يكن في القائمة (تغميق بنسبة 10%)
  const hover = b?.hover ?? (() => {
    const normalized = brand.trim().toLowerCase();
    const hexWithoutHash = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    if (/^[0-9a-f]{6}$/i.test(hexWithoutHash)) {
      const r = parseInt(hexWithoutHash.slice(0, 2), 16);
      const g = parseInt(hexWithoutHash.slice(2, 4), 16);
      const b = parseInt(hexWithoutHash.slice(4, 6), 16);
      const darkerR = Math.max(0, Math.floor(r * 0.9));
      const darkerG = Math.max(0, Math.floor(g * 0.9));
      const darkerB = Math.max(0, Math.floor(b * 0.9));
      return `#${darkerR.toString(16).padStart(2, "0")}${darkerG.toString(16).padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;
    }
    return "#0b1220";
  })();
  const root = document.documentElement;
  root.style.setProperty("--brand", brand);
  root.style.setProperty("--brand-hover", hover);
  root.style.setProperty("--on-brand", "#ffffff");
}
