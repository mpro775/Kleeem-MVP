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

export function sumItems(products: Array<{ price: number; quantity: number }>) {
  return products.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0);
}
