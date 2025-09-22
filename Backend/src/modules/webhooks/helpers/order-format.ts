// helpers/order-format.ts

import type { Order } from './order';

/** يبني رسالة مختصرة للطلبات */
export function buildOrdersListMessage(orders: Order[]): { text: string } {
  if (!orders || !orders.length) {
    return {
      text: 'لم نجد أي طلبات مرتبطة بهذا الرقم. يرجى التأكد من صحة الرقم.',
    };
  }
  let msg = 'هذه طلباتك الأخيرة:\n';
  orders.slice(0, 5).forEach((order) => {
    msg += `- رقم: ${order._id} | الحالة: ${order.status} | التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-EG')}\n`;
  });
  msg += '\nإذا ترغب بمعرفة تفاصيل طلب معين أرسل رقمه.';
  return { text: msg };
}

/** يبني تفاصيل طلب معين */
export function buildOrderDetailsMessage(order: Order | null): {
  text: string;
} {
  if (!order) return { text: 'الطلب غير موجود.' };
  let msg = `تفاصيل طلبك:\n`;
  msg += `- رقم الطلب: ${order._id}\n`;
  msg += `- الحالة: ${order.status}\n`;
  msg += `- التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-EG')}\n`;
  msg += `- الاسم: ${order.customer?.name || '---'}\n`;
  msg += `- الجوال: ${order.customer?.phone || '---'}\n`;
  msg += `- العنوان: ${order.customer?.address || '---'}\n`;
  msg += '\nالمنتجات:\n';
  (order.products || []).forEach((p, idx) => {
    msg += `${idx + 1}- ${p.name || ''} | الكمية: ${p.quantity} | السعر: ${p.price}\n`;
  });
  return { text: msg };
}
