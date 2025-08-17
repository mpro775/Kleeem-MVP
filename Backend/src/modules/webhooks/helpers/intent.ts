// helpers/intent.ts

/** يحدد نوع الرسالة: رقم طلب، رقم جوال، استعلام... */
export function detectOrderIntent(msg: string): {
  step: 'orderDetails' | 'orders' | 'askPhone' | 'normal';
  orderId?: string;
  phone?: string;
} {
  const phoneRegex = /^77\d{7}$/;
  const orderIdRegex = /^[0-9a-fA-F]{24}$/;

  msg = msg.trim();

  if (orderIdRegex.test(msg)) {
    return { step: 'orderDetails', orderId: msg };
  } else if (msg.includes('تفاصيل الطلب')) {
    const idMatch = msg.match(/[0-9a-fA-F]{24}/);
    if (idMatch) return { step: 'orderDetails', orderId: idMatch[0] };
  }
  if (phoneRegex.test(msg)) {
    return { step: 'orders', phone: msg };
  } else if (/طلباتي|حاله طلبي|الطلب/.test(msg)) {
    return { step: 'askPhone' };
  }
  return { step: 'normal' };
}
