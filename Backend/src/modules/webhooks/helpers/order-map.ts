// helpers/order-map.ts
import type { Order as OrderType } from './order';

/* ------------ Type Guards & Utils (بدون any) ------------ */

// كائن عادي
function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

// تاريخ
function isDate(v: unknown): v is Date {
  return v instanceof Date && !Number.isNaN(v.getTime());
}

// ObjectId-مثل
function isObjectIdLike(v: unknown): v is { toHexString: () => string } {
  return (
    isRecord(v) &&
    typeof (v as { toHexString?: unknown }).toHexString === 'function'
  );
}

// 24-hex
function isMongoHexString(s: unknown): s is string {
  return typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
}

// تحويل آمن لسلسلة (بدون استدعاء toString على كائنات مجهولة)
function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (isDate(value)) return value.toISOString();

  // لا تحوِّل كائنات عامة إلى نص لتجنّب no-base-to-string
  // حاول JSON بشكل آمن فقط لو كان Plain Object صغيرًا
  if (isRecord(value)) {
    try {
      const json = JSON.stringify(value);
      // لا نُرجع "[object Object]" لأننا لم نستخدم toString أصلًا
      return typeof json === 'string' ? json : '';
    } catch {
      return '';
    }
  }
  return '';
}

// تحويل آمن لمعرّف نصّي
function toIdString(value: unknown): string {
  if (isObjectIdLike(value)) return value.toHexString();
  if (isMongoHexString(value)) return value;
  // fallback: لو string غير hex نُرجعه كما هو، وإلا فارغ
  return typeof value === 'string' ? value : '';
}

// رقم آمن مع افتراضي
function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------ الماب الرئيسي ------------ */

export function mapOrderDocumentToOrder(
  orderDoc: Record<string, unknown>,
): OrderType {
  const customerRaw = isRecord(orderDoc.customer) ? orderDoc.customer : {};

  // _id
  const id =
    toIdString((orderDoc as { _id?: unknown })._id) ||
    // أحيانًا تُخزّن الأنظمة id كسلسلة
    safeString((orderDoc as { id?: unknown }).id);

  // createdAt
  const createdRaw = (orderDoc as { createdAt?: unknown }).createdAt;
  const createdAt = isDate(createdRaw)
    ? createdRaw.toISOString()
    : safeString(createdRaw);

  // status
  const status = safeString((orderDoc as { status?: unknown }).status);

  // customer
  const customer: { name?: string; phone?: string; address?: string } = {};
  if (customerRaw.name !== undefined)
    customer.name = safeString(customerRaw.name);
  if (customerRaw.phone !== undefined)
    customer.phone = safeString(customerRaw.phone);
  if (customerRaw.address !== undefined)
    customer.address = safeString(customerRaw.address);

  // products
  const productsRaw = (orderDoc as { products?: unknown }).products;
  const products = Array.isArray(productsRaw)
    ? productsRaw.map((p: unknown) => {
        const prod = isRecord(p) ? p : {};
        return {
          name: safeString(prod.name),
          quantity: toNumber(prod.quantity, 0),
          price: toNumber(prod.price, 0),
        };
      })
    : [];

  return {
    _id: id,
    status,
    createdAt,
    customer,
    products,
  };
}
