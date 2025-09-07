export type Currency = "SAR" | "YER" | "USD";

const CURRENCY_INFO: Record<Currency, { symbol: string; locale: string }> = {
  SAR: { symbol: "ر.س", locale: "ar-SA" },
  YER: { symbol: "﷼", locale: "ar-SA" },
  USD: { symbol: "$", locale: "en-US" },
};

export function formatMoney(value: number, currency: Currency = "SAR") {
  const c = CURRENCY_INFO[currency] ?? CURRENCY_INFO.SAR;
  return `${value.toLocaleString(c.locale)} ${c.symbol}`;
}

export function isOfferActive(offer?: {
  enabled?: boolean;
  newPrice?: number;
  oldPrice?: number;
  startAt?: string | Date;
  endAt?: string | Date;
}) {
  if (!offer?.enabled) return false;
  const now = Date.now();
  const start = offer.startAt ? new Date(offer.startAt).getTime() : -Infinity;
  const end = offer.endAt ? new Date(offer.endAt).getTime() : +Infinity;
  return (
    now >= start &&
    now <= end &&
    typeof offer.newPrice === "number" &&
    offer.newPrice > 0
  );
}

export function discountPct(oldP?: number, newP?: number) {
  if (!oldP || !newP || newP >= oldP) return 0;
  return Math.round((1 - newP / oldP) * 100);
}

export function renderCategoryTrail(product: any): string | null {
  const c = product?.category;
  if (!c || typeof c !== "object") return null;
  if (Array.isArray(c.trail) && c.trail.length) return c.trail.join(" › ");
  const child = c.name;
  const parent =
    c.parentName ||
    c.parent?.name ||
    (Array.isArray(c.ancestors) && c.ancestorsNames?.at?.(-1));
  return child ? (parent ? `${child} — ${parent}` : child) : null;
}
