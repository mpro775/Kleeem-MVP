// utils/strings.ts
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// utils/types.ts
type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object';
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function asNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function get(obj: unknown, path: readonly (string | number)[]): unknown {
  if (!isRecord(obj)) return undefined;
  let cur: unknown = obj;
  for (const key of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key as keyof UnknownRecord];
  }
  return cur;
}

// ===== ObjectId helpers & constants =====
const HEX_BASE = 16;
const OBJID_BYTE_LEN = 12;
const MAX_IMAGES = 6;
const MIN_PCT = 0;
const HUNDRED = 100;

function extractRawId(v: UnknownRecord): unknown {
  return v._id ?? v.id ?? v.value ?? v.$oid ?? v;
}

function extractBufferData(raw: unknown): number[] | undefined {
  if (!isRecord(raw)) return undefined;

  if (isRecord(raw.buffer) && Array.isArray(raw.buffer.data)) {
    return raw.buffer.data as number[];
  }

  if (Array.isArray(raw.data)) {
    return raw.data as number[];
  }

  return undefined;
}

function bufferToHexString(bufferData: number[]): string {
  return bufferData
    .map((b) => Number(b).toString(HEX_BASE).padStart(2, '0'))
    .join('');
}

function handlePrimitiveToString(x: unknown): string | undefined {
  const t = typeof x;
  if (t === 'string') return x as string;
  if (t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') {
    return String(x);
  }
  return undefined;
}

function handleFunctionToString(x: unknown): string | undefined {
  try {
    const s = (x as { toString?: () => string }).toString?.();
    return typeof s === 'string' ? s : undefined;
  } catch {
    return undefined;
  }
}

function handleObjectToString(x: unknown): string | undefined {
  const toStr = (x as { toString?: () => string }).toString;
  if (typeof toStr === 'function') {
    try {
      const s = toStr.call(x) as string;
      return typeof s === 'string' ? s : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function safeToString(x: unknown): string | undefined {
  if (x == null) return undefined;

  const t = typeof x;
  if (t === 'function') return handleFunctionToString(x);
  if (t === 'object') return handleObjectToString(x);

  return handlePrimitiveToString(x);
}

function tryToStringConversion(raw: unknown, v: unknown): string | null {
  const rawStr = safeToString(raw);
  const vStr = safeToString(v);

  const maybe = rawStr ?? vStr;
  return typeof maybe === 'string' && maybe !== '[object Object]'
    ? maybe
    : null;
}

export function toIdStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;

  if (!isRecord(v)) return null;

  const raw = extractRawId(v);
  if (typeof raw === 'string') return raw;

  const bufferData = extractBufferData(raw);
  if (Array.isArray(bufferData) && bufferData.length === OBJID_BYTE_LEN) {
    return bufferToHexString(bufferData);
  }

  return tryToStringConversion(raw, v);
}

export function toNum(x: unknown): number | null {
  return asNumber(x);
}

// ===== Product typing (خفيف ومرن) =====
export interface PriceOffer {
  enabled?: boolean;
  oldPrice?: number | string;
  newPrice?: number | string;
  startAt?: string | Date;
  endAt?: string | Date;
}

export interface EmbeddableProduct {
  id: string;
  merchantId: string;
  name?: string;
  description?: string;

  categoryId?: string;
  categoryName?: string;

  slug?: string;
  storefrontSlug?: string;
  domain?: string;
  publicUrlStored?: string;

  specsBlock?: unknown[];
  keywords?: unknown[];
  attributes?: UnknownRecord;
  images?: unknown[];

  price: number | null;
  priceEffective: number | null;
  currency?: string;

  hasActiveOffer: boolean;
  priceOld: number | null;
  priceNew: number | null;
  offerStart?: string | Date;
  offerEnd?: string | Date;
  discountPct: number | null;

  isAvailable?: boolean;
  status?: unknown;
  quantity?: number;
}

// ===== Normalizers =====
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

// ===== Pricing =====
export function computePricing(doc: unknown): {
  price: number | null;
  priceOld: number | null;
  priceNew: number | null;
  effective: number | null;
  hasOffer: boolean;
  discountPct: number | null;
} {
  const price = toNum(get(doc, ['price']));
  const priceOld = toNum(get(doc, ['offer', 'oldPrice']));
  const priceNew = toNum(get(doc, ['offer', 'newPrice']));
  const effective = toNum(get(doc, ['priceEffective'])) ?? price ?? null;

  const offerEnabled = Boolean(get(doc, ['offer', 'enabled']));
  const hasOffer = offerEnabled && priceOld != null && priceNew != null;

  const discountPct =
    hasOffer && priceOld > 0
      ? Math.max(
          MIN_PCT,
          Math.round(((priceOld - priceNew) / priceOld) * HUNDRED),
        )
      : null;

  return { price, priceOld, priceNew, effective, hasOffer, discountPct };
}

// ===== Field Extractors =====
function extractBasicFields(doc: unknown) {
  return {
    id: toIdStr(get(doc, ['_id'])) ?? '',
    merchantId: toIdStr(get(doc, ['merchantId'])) ?? '',
    name: asString(get(doc, ['name'])) ?? undefined,
    description: asString(get(doc, ['description'])) ?? undefined,
    categoryId: toIdStr(get(doc, ['category'])) ?? undefined,
  };
}

function extractUrlFields(
  doc: unknown,
  sf?: { slug?: string; domain?: string } | null,
) {
  return {
    slug: asString(get(doc, ['slug'])) ?? undefined,
    storefrontSlug:
      sf?.slug ?? asString(get(doc, ['storefrontSlug'])) ?? undefined,
    domain: sf?.domain ?? asString(get(doc, ['storefrontDomain'])) ?? undefined,
    publicUrlStored:
      asString(get(doc, ['publicUrlStored'])) ??
      asString(get(doc, ['publicUrl'])) ??
      undefined,
  };
}

function extractContentFields(doc: unknown) {
  const specsBlockRaw = get(doc, ['specsBlock']);
  const keywordsRaw = get(doc, ['keywords']);
  const imagesRaw = get(doc, ['images']);

  return {
    specsBlock: Array.isArray(specsBlockRaw) ? specsBlockRaw : undefined,
    keywords: Array.isArray(keywordsRaw) ? keywordsRaw : undefined,
    attributes: (() => {
      const a = get(doc, ['attributes']);
      return isRecord(a) ? a : undefined;
    })(),
    images: Array.isArray(imagesRaw)
      ? imagesRaw.slice(0, MAX_IMAGES)
      : undefined,
    currency: asString(get(doc, ['currency'])) ?? undefined,
  };
}

function extractStatusFields(doc: unknown) {
  const isAvailableRaw = get(doc, ['isAvailable']);
  return {
    isAvailable:
      typeof isAvailableRaw === 'boolean' ? isAvailableRaw : undefined,
    status: get(doc, ['status']) ?? undefined,
    quantity: toNum(get(doc, ['quantity'])) ?? undefined,
  };
}

function extractOfferFields(doc: unknown) {
  const { price, priceOld, priceNew, effective, hasOffer, discountPct } =
    computePricing(doc);
  return {
    price,
    priceEffective: effective,
    hasActiveOffer: hasOffer,
    priceOld,
    priceNew,
    offerStart:
      (get(doc, ['offer', 'startAt']) as string | Date | undefined) ??
      undefined,
    offerEnd:
      (get(doc, ['offer', 'endAt']) as string | Date | undefined) ?? undefined,
    discountPct,
  };
}

// ===== Embeddable DTO =====
export function toEmbeddable(
  doc: unknown,
  sf?: { slug?: string; domain?: string } | null,
  categoryName?: string | null,
): EmbeddableProduct {
  const basic = extractBasicFields(doc);
  const urls = extractUrlFields(doc, sf);
  const content = extractContentFields(doc);
  const status = extractStatusFields(doc);
  const offer = extractOfferFields(doc);

  return {
    ...basic,
    categoryName: categoryName ?? undefined,
    ...urls,
    ...content,
    ...offer,
    ...status,
  };
}
