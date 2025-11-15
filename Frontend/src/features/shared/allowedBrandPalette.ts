export type BrandOption = { label: string; hex: `#${string}` };

export const ALLOWED_BRAND_DARK: BrandOption[] = [
  { label: "Slate 900",   hex: "#111827" },
  { label: "Midnight",    hex: "#0B1220" },
  { label: "Indigo 950",  hex: "#1E1B4B" },
  { label: "Indigo 900",  hex: "#312E81" },
  { label: "Violet 950",  hex: "#3B0764" },
  { label: "Rosewood",    hex: "#3F1D2B" },
  { label: "Teal 950",    hex: "#052E2B" },
  { label: "Emerald 900", hex: "#064E3B" },
  { label: "Red 900",     hex: "#7F1D1D" },
  { label: "Gray 900",    hex: "#1F2937" },
];
export const DEFAULT_BRAND_DARK = "#111827" as const;
