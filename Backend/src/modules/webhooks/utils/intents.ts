// src/modules/webhooks/utils/intents.ts
export interface DetectIntentResult {
  step: 'orderDetails' | 'orders' | 'askPhone' | 'normal';
  orderId?: string;
  phone?: string;
}

export function detectOrderIntent(msg: string): DetectIntentResult {
  const phoneRegex = /^77\d{7}$/;
  const orderIdRegex = /^[0-9a-fA-F]{24}$/;
  const text = (msg || '').trim();

  if (orderIdRegex.test(text)) return { step: 'orderDetails', orderId: text };

  if (text.includes('تفاصيل الطلب')) {
    const idMatch = text.match(/[0-9a-fA-F]{24}/);
    if (idMatch) return { step: 'orderDetails', orderId: idMatch[0] };
  }

  if (phoneRegex.test(text)) return { step: 'orders', phone: text };
  if (/طلباتي|حاله طلبي|الطلب/.test(text)) return { step: 'askPhone' };

  return { step: 'normal' };
}
