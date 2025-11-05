import type { Currency } from '@/features/merchant/products/types';

const SYMBOL: Record<Currency, string> = {
  SAR: 'ر.س',
  YER: 'ر.ي',
  USD: '$',
};

export function formatMoney(
  value: number | undefined,
  currency: Currency = 'SAR'
) {
  const v = Number(value ?? 0);
  const sym = SYMBOL[currency] ?? '';
  return `${v.toLocaleString()} ${sym}`;
}

