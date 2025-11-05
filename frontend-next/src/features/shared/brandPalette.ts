export const BRANDS = {
  slate: { hex: "#111827", name: "Slate" },
  charcoal: { hex: "#1f2937", name: "Charcoal" },
  navy: { hex: "#0b1f4b", name: "Navy" },
  indigo: { hex: "#1e1b4b", name: "Indigo" },
  purple: { hex: "#3b0764", name: "Purple" },
  teal: { hex: "#134e4a", name: "Teal" },
  emerald: { hex: "#064e3b", name: "Emerald" },
  forest: { hex: "#14532d", name: "Forest" },
  maroon: { hex: "#4a0e0e", name: "Maroon" },
  chocolate: { hex: "#3e2723", name: "Chocolate" },
} as const;

export type BrandKey = keyof typeof BRANDS;

