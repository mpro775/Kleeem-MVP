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
      const s = toStr.call(x);
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
  const result: Partial<EmbeddableProduct> = {
    id: toIdStr(get(doc, ['_id'])) ?? '',
    merchantId: toIdStr(get(doc, ['merchantId'])) ?? '',
  };

  const name = asString(get(doc, ['name']));
  if (name !== null) result.name = name;

  const description = asString(get(doc, ['description']));
  if (description !== null) result.description = description;

  const categoryId = toIdStr(get(doc, ['category']));
  if (categoryId !== null) result.categoryId = categoryId;

  return result;
}

function extractUrlFields(
  doc: unknown,
  sf?: { slug?: string; domain?: string } | null,
) {
  const result: Partial<EmbeddableProduct> = {};

  const slug = asString(get(doc, ['slug']));
  if (slug !== null) result.slug = slug;

  const storefrontSlug = sf?.slug ?? asString(get(doc, ['storefrontSlug']));
  if (storefrontSlug != null) result.storefrontSlug = storefrontSlug;

  const domain = sf?.domain ?? asString(get(doc, ['storefrontDomain']));
  if (domain != null) result.domain = domain;

  const publicUrlStored =
    asString(get(doc, ['publicUrlStored'])) ??
    asString(get(doc, ['publicUrl']));
  if (publicUrlStored != null) result.publicUrlStored = publicUrlStored;

  return result;
}

function extractContentFields(doc: unknown) {
  const result: Partial<EmbeddableProduct> = {};

  const specsBlockRaw = get(doc, ['specsBlock']);
  if (Array.isArray(specsBlockRaw)) result.specsBlock = specsBlockRaw;

  const keywordsRaw = get(doc, ['keywords']);
  if (Array.isArray(keywordsRaw)) result.keywords = keywordsRaw;

  const attributes = get(doc, ['attributes']);
  if (isRecord(attributes)) result.attributes = attributes;

  const imagesRaw = get(doc, ['images']);
  if (Array.isArray(imagesRaw)) result.images = imagesRaw.slice(0, MAX_IMAGES);

  const currency = asString(get(doc, ['currency']));
  if (currency !== null) result.currency = currency;

  return result;
}

function extractStatusFields(doc: unknown) {
  const result: Partial<EmbeddableProduct> = {};

  const isAvailableRaw = get(doc, ['isAvailable']);
  if (typeof isAvailableRaw === 'boolean') result.isAvailable = isAvailableRaw;

  const status = get(doc, ['status']);
  if (status !== undefined) result.status = status;

  const quantity = toNum(get(doc, ['quantity']));
  if (quantity !== null) result.quantity = quantity;

  return result;
}

function extractOfferFields(doc: unknown) {
  const { price, priceOld, priceNew, effective, hasOffer, discountPct } =
    computePricing(doc);

  const result: Partial<EmbeddableProduct> = {
    price,
    priceEffective: effective,
    hasActiveOffer: hasOffer,
    priceOld,
    priceNew,
    discountPct,
  };

  const offerStart = get(doc, ['offer', 'startAt']) as
    | string
    | Date
    | undefined;
  if (offerStart !== undefined) result.offerStart = offerStart;

  const offerEnd = get(doc, ['offer', 'endAt']) as string | Date | undefined;
  if (offerEnd !== undefined) result.offerEnd = offerEnd;

  return result;
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

  const result = {
    ...basic,
    ...urls,
    ...content,
    ...offer,
    ...status,
    ...(categoryName !== undefined && { categoryName }),
  } as EmbeddableProduct;

  return result;
}
