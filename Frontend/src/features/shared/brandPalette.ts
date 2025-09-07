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
  if (hex && ALLOWED_HEX.has(hex.toLowerCase())) return hex;
  return "#111827"; // fallback
}

export function applyBrandCssVars(hex: string) {
  const b = findBrandByHex(hex);
  const brand = b?.hex ?? "#111827";
  const hover = b?.hover ?? "#0b1220";
  const root = document.documentElement;
  root.style.setProperty("--brand", brand);
  root.style.setProperty("--brand-hover", hover);
  root.style.setProperty("--on-brand", "#ffffff");
}
