export function setBrandVars(hex: string) {
  const root = document.documentElement;
  root.style.setProperty("--brand", hex);
  root.style.setProperty("--on-brand", "#FFFFFF");
  root.style.setProperty("--brand-hover", lighten(hex, 8));
}

function lighten(hex: string, percent: number) {
  const p = Math.max(-100, Math.min(100, percent)) / 100;
  const [r, g, b] = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16));
  const n = (x: number) => Math.round(x + (255 - x) * p);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(n(r))}${toHex(n(g))}${toHex(n(b))}`;
}
