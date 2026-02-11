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

/** سعر العرض للمنتج: priceEffective ثم priceDefault ثم prices[currency] ثم price */
export function getProductDisplayPrice(
  p: {
    priceEffective?: number;
    priceDefault?: number;
    prices?: Record<string, number>;
    price?: number;
    currency?: string;
  },
  currency = "SAR"
): number {
  const c = p.currency ?? currency;
  return (
    p.priceEffective ??
    p.priceDefault ??
    (p.prices && typeof p.prices[c] === "number" ? p.prices[c] : undefined) ??
    p.price ??
    0
  );
}

type CategoryLike = {
  name?: string;
  trail?: string[];
  parentName?: string;
  parent?: { name?: string } | null;
  ancestors?: unknown[];
  ancestorsNames?: string[];
};

type ProductWithCategory =
  | { category?: string | CategoryLike | null }
  | null
  | undefined;

export function renderCategoryTrail(product: ProductWithCategory): string | null {
  const c = product?.category;
  if (!c) return null;

  // إذا كانت كـ string مباشرة (كما في ProductResponse الحالي)
  if (typeof c === "string") {
    const s = c.trim();
    return s.length ? s : null;
  }

  // من هنا نتعامل مع الكائن
  if (Array.isArray(c.trail) && c.trail.length > 0) {
    return c.trail.join(" › ");
  }

  const child = c.name ?? "";
  const parent =
    c.parentName ||
    c.parent?.name ||
    (Array.isArray(c.ancestorsNames) && c.ancestorsNames.length > 0
      ? c.ancestorsNames[c.ancestorsNames.length - 1]
      : undefined);

  if (!child && !parent) return null;
  return child ? (parent ? `${child} — ${parent}` : child) : parent ?? null;
}