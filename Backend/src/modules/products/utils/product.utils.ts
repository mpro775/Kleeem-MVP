export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const toIdStr = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const raw = v._id ?? v.id ?? v.value ?? v.$oid ?? v;
    if (typeof raw === 'string') return raw;
    const data = raw?.buffer?.data ?? raw?.data;
    if (Array.isArray(data) && data.length === 12) {
      return Array.from(data)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    const maybe = raw?.toString?.() ?? v?.toString?.();
    if (maybe && maybe !== '[object Object]') return String(maybe);
  }
  return null;
};

const toNum = (x: any): number | null => {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : null;
};

// يبني DTO مناسب للفهرسة في المتجهات
export const toEmbeddable = (
  doc: any,
  sf?: { slug?: string; domain?: string } | null,
  categoryName?: string | null,
) => {
  const {
    _id,
    merchantId,
    name,
    description,
    specsBlock,
    keywords,
    images,
    attributes,
    status,
    isAvailable,
    quantity,
  } = doc;

  const categoryId = toIdStr(doc.category);
  const storefrontSlug = sf?.slug ?? doc.storefrontSlug ?? undefined;
  const domain = sf?.domain ?? doc.storefrontDomain ?? undefined;

  const { price, priceOld, priceNew, effective, hasOffer, discountPct } =
    computePricing(doc);

  return {
    id: String(_id),
    merchantId: toIdStr(merchantId)!,

    name,
    description,

    // الفئة
    categoryId: categoryId ?? undefined,
    categoryName: categoryName ?? undefined,

    // روابط/سلاج
    slug: doc.slug ?? undefined,
    storefrontSlug: storefrontSlug ?? undefined,
    domain: domain ?? undefined,
    publicUrlStored: doc.publicUrlStored ?? doc.publicUrl ?? undefined, // لو مخزّنة عندك

    // وسوم/مواصفات/سمات/صور
    specsBlock: Array.isArray(specsBlock) ? specsBlock : undefined,
    keywords: Array.isArray(keywords) ? keywords : undefined,
    attributes: attributes || undefined,
    images: Array.isArray(images) ? images.slice(0, 6) : undefined,

    // تسعير/عرض
    price,
    priceEffective: effective,
    currency: doc.currency ?? undefined,

    hasActiveOffer: hasOffer,
    priceOld,
    priceNew,
    offerStart: doc.offer?.startAt ?? undefined,
    offerEnd: doc.offer?.endAt ?? undefined,
    discountPct,

    // حالة
    isAvailable: typeof isAvailable === 'boolean' ? isAvailable : undefined,
    status: status ?? undefined,
    quantity: toNum(quantity) ?? undefined,
  };
};
export const normalizeQuery = (query: string) => {
  return query.trim().toLowerCase();
};
export const computePricing = (doc: any) => {
  const price = toNum(doc.price);
  const priceOld = toNum(doc.offer?.oldPrice);
  const priceNew = toNum(doc.offer?.newPrice);
  const effective = toNum(doc.priceEffective) ?? price ?? null;
  const hasOffer =
    !!doc?.offer?.enabled && priceOld != null && priceNew != null;
  const discountPct =
    hasOffer && priceOld! > 0
      ? Math.max(0, Math.round(((priceOld! - priceNew!) / priceOld!) * 100))
      : null;
  return { price, priceOld, priceNew, effective, hasOffer, discountPct };
};
