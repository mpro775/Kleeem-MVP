// src/vector/vector.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type PineconeRecord,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from '@pinecone-database/pinecone';
import { I18nService } from 'nestjs-i18n';
import { v5 as uuidv5 } from 'uuid';

import { Collections, Namespaces } from './utils/collections';
import { EmbeddingsClient } from './utils/embeddings.client';
import { geminiRerankTopN } from './utils/geminiRerank';
import { PineconeWrapper } from './utils/pinecone.client';

import type {
  BotFaqSearchItem,
  DocumentData,
  EmbeddableProduct,
  FAQData,
  SearchResult,
  WebData,
} from './utils/types';
import type { Cache } from 'cache-manager';

/** ===== ثوابت للتخلّص من الأرقام السحرية ===== */
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const DEFAULT_DIM = 384;
const MAX_EMBED_TEXT_FALLBACK = 3000;
const TO_STRING_MAX_DEPTH = 4;
const CACHE_TTL_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND; // ساعة
const DEFAULT_BATCH_PRODUCTS = 10;
const DEFAULT_BATCH_WEB = 10;
const DEFAULT_BATCH_DOCS = 2;
const DEFAULT_MIN_SCORE = 0;
const RERANK_MULTIPLIER = 4;
const DEFAULT_PUBLIC_BASE = 'https://kaleem-ai.com';

type PineconeFilter = Record<string, { $eq: string | number | boolean }>;
type VectorRecord<TMetadata extends RecordMetadata> = PineconeRecord<TMetadata>;
type ScoredRecord<TMetadata extends RecordMetadata> =
  ScoredPineconeRecord<TMetadata>;

type ProductResult = {
  id: string;
  name: string;
  score: number;
  price?: number;
  url?: string;
  currency?: string;
  categoryName?: string;
  images?: string[];
  hasOffer?: boolean;
  priceOld?: number | null;
  priceNew?: number | null;
  discountPct?: number | null;
};

/** ===== Payloads مبسّطة لما نخزّنه في Pinecone ===== */
type ProductPayload = RecordMetadata & {
  mongoId: string;
  merchantId?: string;
  name: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  specsBlock?: string;
  keywords?: string[];
  images?: string[];
  slug?: string;
  storefrontSlug?: string;
  domain?: string;
  publicUrlStored?: string;
  price?: number;
  priceEffective?: number;
  currency?: string;
  hasOffer?: boolean;
  priceOld?: number;
  priceNew?: number;
  offerStart?: string;
  offerEnd?: string;
  discountPct?: number;
  isAvailable?: boolean;
  status?: string;
  quantity?: number;
};

type WebPayload = RecordMetadata & {
  merchantId: string;
  text: string;
  url?: string;
  title?: string;
  type?: string;
  source?: string;
};

type DocChunkPayload = RecordMetadata & {
  merchantId?: string;
  documentId?: string;
  text?: string;
};

type BotFaqPayload = RecordMetadata & {
  faqId: string;
  question: string;
  answer: string;
  type?: 'faq';
  source?: string;
  tags?: string[];
  locale?: string;
};

type FAQPayload = RecordMetadata & {
  question?: string;
  answer?: string;
};

/** ===== Helpers ثابتة للـ UUID ===== */
const qdrantIdForProduct = (mongoId: unknown) =>
  uuidv5(String(mongoId), Namespaces.Product);

/** ===== حُرّاس وأنواع مساعدة ===== */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBufferLike(v: unknown): v is { type: 'Buffer'; data: unknown[] } {
  return isObject(v) && v.type === 'Buffer' && Array.isArray(v.data);
}

function isMongoHex(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s);
}

/** يحاول استدعاء toHexString إن وُجد */
function toMaybeHexString(v: unknown): string | null {
  if (
    v &&
    typeof (v as { toHexString?: () => string }).toHexString === 'function'
  ) {
    return (v as { toHexString: () => string }).toHexString();
  }
  return null;
}

function buildEqFilter(
  key: string,
  value: string | number | boolean,
): PineconeFilter {
  return { [key]: { $eq: value } };
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);

  // إعدادات قابلة للتهيئة
  private readonly dim: number;
  private readonly embeddingBase: string;

  private readonly upsertBatchProducts: number;
  private readonly upsertBatchWeb: number;
  private readonly upsertBatchDocs: number;
  private readonly minScore: number;

  constructor(
    private readonly pinecone: PineconeWrapper,
    private readonly embeddings: EmbeddingsClient,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.embeddingBase = (
      this.config.get<string>('EMBEDDING_BASE_URL') || ''
    ).replace(/\/+$/, '');
    if (!this.embeddingBase) throw new Error('EMBEDDING_BASE_URL is required');

    this.dim = Number(this.config.get('EMBEDDING_DIM') ?? DEFAULT_DIM);

    this.upsertBatchProducts = Number(
      this.config.get('VECTOR_UPSERT_BATCH_PRODUCTS') ?? DEFAULT_BATCH_PRODUCTS,
    );
    this.upsertBatchWeb = Number(
      this.config.get('VECTOR_UPSERT_BATCH_WEB') ?? DEFAULT_BATCH_WEB,
    );
    this.upsertBatchDocs = Number(
      this.config.get('VECTOR_UPSERT_BATCH_DOCS') ?? DEFAULT_BATCH_DOCS,
    );

    this.minScore = Number(
      this.config.get('VECTOR_MIN_SCORE') ?? DEFAULT_MIN_SCORE,
    );
  }

  /** ===== Lifecycle ===== */
  public async onModuleInit(): Promise<void> {
    const apiKey = this.config.get<string>('PINECONE_API_KEY');
    const host = this.config.get<string>('PINECONE_INDEX_HOST');
    const indexName =
      this.config.get<string>('PINECONE_INDEX_NAME') || 'kaleem-index';
    if (!apiKey) throw new Error('PINECONE_API_KEY is required');
    if (!host) throw new Error('PINECONE_INDEX_HOST is required');
    this.pinecone.init({ apiKey, indexName, host });

    await this.ensureCollections().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ensureCollections skipped/failed: ${msg}`);
    });
    this.logger.log(
      `VectorService initialized (dim=${this.dim}, minScore=${this.minScore})`,
    );
  }

  private async ensureCollections(): Promise<void> {
    await Promise.all([
      this.pinecone.ensureCollection(Collections.Products, this.dim),
      this.pinecone.ensureCollection(Collections.Offers, this.dim),
      this.pinecone.ensureCollection(Collections.FAQs, this.dim),
      this.pinecone.ensureCollection(Collections.Documents, this.dim),
      this.pinecone.ensureCollection(Collections.Web, this.dim),
      this.pinecone.ensureCollection(Collections.BotFAQs, this.dim),
    ]);
  }
  // بدّل الدالة السابقة isPrimitiveType بهذه:
  private isPrimitive(
    value: unknown,
  ): value is string | number | boolean | bigint {
    const t = typeof value;
    return (
      t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint'
    );
  }

  // عدّل stringifySafe لتتجنّب إرجاع any من Object.prototype.toString.call
  private stringifySafe(value: unknown): string {
    if (value == null) return '';
    if (this.isPrimitive(value)) return String(value);
    if (value instanceof Date) return value.toISOString();
    const hex = toMaybeHexString(value);
    if (hex) return hex;
    try {
      return JSON.stringify(value);
    } catch {
      // لا تعتمد على toString الافتراضي؛ لفّها داخل String() لضمان النوع
      return String(Object.prototype.toString.call(value));
    }
  }

  // حارس MongoId آمن دون تعيين any
  private tryMongoIdString(obj: Record<string, unknown>): string | null {
    const maybe = (obj as { toString?: unknown }).toString;
    if (typeof maybe !== 'function') return null;
    if (maybe === Object.prototype.toString) return null;
    const s = String((maybe as () => unknown).call(obj as object));
    return isMongoHex(s) ? s : null;
  }

  /**
   * Pinecone يرفض null والقيم المركّبة؛ نقوم بتسطيح/تحويل القيم
   */
  private sanitizeMetadata(payload: Record<string, unknown>): RecordMetadata {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        clean[key] = value.map((v) =>
          typeof v === 'object' ? JSON.stringify(v) : String(v),
        );
        continue;
      }
      if (value instanceof Date) {
        clean[key] = value.toISOString();
        continue;
      }
      if (typeof value === 'object') {
        clean[key] = JSON.stringify(value);
        continue;
      }
      clean[key] = value;
    }
    return clean as RecordMetadata;
  }

  private toPineconeFilter(input: unknown): PineconeFilter | undefined {
    const buildFromMust = (must: unknown[]): PineconeFilter => {
      const out: PineconeFilter = {};
      for (const cond of must) {
        if (
          isObject(cond) &&
          typeof (cond as { key?: unknown }).key === 'string' &&
          isObject((cond as { match?: unknown }).match) &&
          'value' in (cond as { match: { value?: unknown } }).match
        ) {
          const key = (cond as { key: string }).key;
          const val = (cond as { match: { value: unknown } }).match.value;
          if (
            typeof val === 'string' ||
            typeof val === 'number' ||
            typeof val === 'boolean'
          ) {
            out[key] = { $eq: val };
          }
        }
      }
      return out;
    };

    if (
      isObject(input) &&
      'filter' in input &&
      isObject((input as { filter: unknown }).filter)
    ) {
      const must = (input as { filter: { must?: unknown } }).filter.must;
      if (Array.isArray(must)) {
        const out = buildFromMust(must);
        if (Object.keys(out).length) return out;
      }
    }

    const asPinecone = input as PineconeFilter;
    if (Object.values(asPinecone).some((v) => isObject(v) && '$eq' in v))
      return asPinecone;
    return undefined;
  }

  /** ===== Utilities: تحويل إلى قائمة نصوص مع حماية الدورات ===== */
  private toStringList(
    val: unknown,
    seen: WeakSet<object> = new WeakSet(),
    depth = 0,
  ): string[] {
    if (val == null) return [];
    if (depth >= TO_STRING_MAX_DEPTH) return [this.stringifySafe(val)];

    if (this.isPrimitive(val)) return [String(val)];

    if (Array.isArray(val)) {
      const out: string[] = [];
      for (const item of val)
        out.push(...this.toStringList(item, seen, depth + 1));
      return out;
    }

    if (isObject(val)) return this.processObject(val, seen, depth);

    // (symbol/function/...) → تسلسل آمن
    return [this.stringifySafe(val)];
  }

  private processObject(
    obj: Record<string, unknown>,
    seen: WeakSet<object>,
    depth: number,
  ): string[] {
    if (seen.has(obj)) return ['[Circular]'];
    seen.add(obj);

    if (obj instanceof Date) return [obj.toISOString()];

    const hex = toMaybeHexString(obj);
    if (hex) return [hex];

    if (isBufferLike(obj)) {
      const len = Array.isArray((obj as { data?: unknown }).data)
        ? (obj as { data: unknown[] }).data.length
        : 0;
      return [`[Buffer:${len}]`];
    }

    const mongoMaybe = this.tryMongoIdString(obj);
    if (mongoMaybe) return [mongoMaybe];

    return this.processObjectValues(obj, seen, depth);
  }

  private async deleteExistingProductPoint(mongoId: string): Promise<void> {
    await this.pinecone
      .deleteMany(Collections.Products, [qdrantIdForProduct(mongoId)])
      .catch(() => undefined);
  }

  private computeDiscountPct(
    priceOld?: number | null,
    priceNew?: number | null,
  ): number | undefined {
    if (!priceOld || !priceNew || priceOld <= 0) return undefined;
    return Math.max(0, Math.round(((priceOld - priceNew) / priceOld) * 100));
  }
  private buildProductBasicInfo(
    p: EmbeddableProduct,
  ): Pick<ProductPayload, 'mongoId' | 'merchantId' | 'name' | 'description'> {
    return {
      mongoId: p.id,
      merchantId: p.merchantId,
      name: p.name ?? '',
      description: p.description ?? '',
    };
  }

  private buildProductCategoryInfo(
    p: EmbeddableProduct,
  ): Partial<Pick<ProductPayload, 'categoryId' | 'categoryName'>> {
    const out: Partial<Pick<ProductPayload, 'categoryId' | 'categoryName'>> =
      {};
    if (p.categoryId) out.categoryId = p.categoryId;
    if (p.categoryName) out.categoryName = p.categoryName;
    return out;
  }

  private buildProductContentInfo(
    p: EmbeddableProduct,
  ): Pick<ProductPayload, 'specsBlock' | 'keywords' | 'images'> {
    const specsBlock = Array.isArray(p.specsBlock)
      ? this.safeJoinComma(p.specsBlock)
      : '';
    const keywords = Array.isArray(p.keywords)
      ? p.keywords
          .map((k) => this.safeJoin(k, '/'))
          .filter((k): k is string => typeof k === 'string' && k.length > 0)
      : [];
    const images = Array.isArray(p.images)
      ? p.images.filter((img): img is string => typeof img === 'string')
      : [];
    return { specsBlock, keywords, images };
  }

  private buildProductStoreInfo(
    p: EmbeddableProduct,
  ): Partial<
    Pick<
      ProductPayload,
      'slug' | 'storefrontSlug' | 'domain' | 'publicUrlStored'
    >
  > {
    const out: Partial<
      Pick<
        ProductPayload,
        'slug' | 'storefrontSlug' | 'domain' | 'publicUrlStored'
      >
    > = {};
    if (p.slug) out.slug = p.slug;
    if (p.storefrontSlug) out.storefrontSlug = p.storefrontSlug;
    if (p.domain) out.domain = p.domain;
    if (p.publicUrlStored) out.publicUrlStored = p.publicUrlStored;
    return out;
  }

  private buildProductPricingInfo(
    p: EmbeddableProduct,
    discountPct: number | undefined,
  ): Partial<
    Pick<
      ProductPayload,
      | 'price'
      | 'priceEffective'
      | 'currency'
      | 'hasOffer'
      | 'priceOld'
      | 'priceNew'
      | 'offerStart'
      | 'offerEnd'
      | 'discountPct'
    >
  > {
    const out: Partial<
      Pick<
        ProductPayload,
        | 'price'
        | 'priceEffective'
        | 'currency'
        | 'hasOffer'
        | 'priceOld'
        | 'priceNew'
        | 'offerStart'
        | 'offerEnd'
        | 'discountPct'
      >
    > = {};

    if (Number.isFinite(p.price as number)) out.price = p.price as number;
    if (Number.isFinite(p.priceEffective as number))
      out.priceEffective = p.priceEffective as number;
    if (p.currency) out.currency = p.currency;
    if (typeof p.hasActiveOffer === 'boolean') out.hasOffer = p.hasActiveOffer;
    if (p.priceOld != null) out.priceOld = p.priceOld;
    if (p.priceNew != null) out.priceNew = p.priceNew;
    if (p.offerStart) {
      out.offerStart =
        p.offerStart instanceof Date
          ? p.offerStart.toISOString()
          : String(p.offerStart);
    }
    if (p.offerEnd) {
      out.offerEnd =
        p.offerEnd instanceof Date
          ? p.offerEnd.toISOString()
          : String(p.offerEnd);
    }
    if (typeof discountPct === 'number') out.discountPct = discountPct;

    return out;
  }

  private buildProductStatusInfo(
    p: EmbeddableProduct,
  ): Partial<Pick<ProductPayload, 'isAvailable' | 'status' | 'quantity'>> {
    const out: Partial<
      Pick<ProductPayload, 'isAvailable' | 'status' | 'quantity'>
    > = {};
    if (typeof p.isAvailable === 'boolean') out.isAvailable = p.isAvailable;
    if (p.status) out.status = p.status;
    if (p.quantity != null) out.quantity = p.quantity;
    return out;
  }

  private buildProductPayload(
    p: EmbeddableProduct,
    discountPct: number | undefined,
  ): ProductPayload {
    return {
      ...this.buildProductBasicInfo(p),
      ...this.buildProductCategoryInfo(p),
      ...this.buildProductContentInfo(p),
      ...this.buildProductStoreInfo(p),
      ...this.buildProductPricingInfo(p, discountPct),
      ...this.buildProductStatusInfo(p),
    };
  }
  private async buildProductVector(
    p: EmbeddableProduct,
    discountPct: number | undefined,
  ): Promise<number[]> {
    const text = this.buildTextForEmbedding({
      ...p,
      discountPct: discountPct ?? null,
    });
    return this.embed(text);
  }

  private async buildProductPoint(
    p: EmbeddableProduct,
  ): Promise<VectorRecord<ProductPayload>> {
    await this.deleteExistingProductPoint(p.id);
    const discountPct = this.computeDiscountPct(
      p.priceOld ?? null,
      p.priceNew ?? null,
    );
    const vector = await this.buildProductVector(p, discountPct);
    return {
      id: qdrantIdForProduct(p.id),
      values: vector,
      metadata: this.sanitizeMetadata(
        this.buildProductPayload(p, discountPct),
      ) as ProductPayload,
    };
  }
  private isIndexObjArray(
    input: unknown[],
  ): input is Array<{ index: number; score?: number }> {
    return input.every(
      (x) =>
        isObject(x) && typeof (x as { index?: unknown }).index === 'number',
    );
  }

  private toRerankedIdx(input: unknown, topK: number): number[] | null {
    if (!Array.isArray(input) || input.length === 0) return null;

    const arr = input as unknown[];
    const first = arr[0];
    if (typeof first === 'number') {
      const nums = arr.filter((x): x is number => typeof x === 'number');
      return nums.slice(0, topK);
    }

    if (this.isIndexObjArray(arr)) {
      return arr.map((x) => x.index).slice(0, topK);
    }

    return null;
  }

  /** معالجة قيم الكائن مع الارتداد لدورة الحياة */
  private processObjectValues(
    obj: Record<string, unknown>,
    seen: WeakSet<object>,
    depth: number,
  ): string[] {
    const values = Object.values(obj);
    if (!values.length) return [this.stringifySafe(obj)];
    const out: string[] = [];
    for (const v of values) out.push(...this.toStringList(v, seen, depth + 1));
    return out;
  }

  private buildBasicParts(p: EmbeddableProduct): string[] {
    const parts: string[] = [];
    if (p.name) parts.push(`Name: ${p.name}`);
    if (p.description) parts.push(`Description: ${p.description}`);
    return parts;
  }

  private buildCategoryPart(p: EmbeddableProduct): string[] {
    if (!p.categoryId && !p.categoryName) return [];
    return [`Category: ${this.safeJoin(p.categoryName ?? p.categoryId)}`];
  }

  private buildSpecsAndAttrsParts(p: EmbeddableProduct): string[] {
    const parts: string[] = [];
    if (p.specsBlock && this.toStringList(p.specsBlock).length) {
      parts.push(`Specs: ${this.safeJoinComma(p.specsBlock)}`);
    }
    if (p.attributes) {
      const attrs = Object.entries(p.attributes).map(
        ([k, v]) => `${k}: ${this.safeJoin(v, '/')}`,
      );
      if (attrs.length) parts.push(`Attributes: ${attrs.join('; ')}`);
    }
    return parts;
  }

  private buildKeywordsPart(p: EmbeddableProduct): string[] {
    if (p.keywords && this.toStringList(p.keywords).length) {
      return [`Keywords: ${this.safeJoinComma(p.keywords)}`];
    }
    return [];
  }

  private buildPricingParts(p: EmbeddableProduct): string[] {
    const parts: string[] = [];
    if (p.hasActiveOffer && p.priceOld != null && p.priceNew != null) {
      parts.push(`Offer: from ${p.priceOld} to ${p.priceNew}`);
    }
    if (p.price != null) {
      parts.push(`Price: ${p.price} ${p.currency || ''}`.trim());
    }
    return parts;
  }

  private buildTextForEmbedding(product: EmbeddableProduct): string {
    const parts = [
      ...this.buildBasicParts(product),
      ...this.buildCategoryPart(product),
      ...this.buildSpecsAndAttrsParts(product),
      ...this.buildKeywordsPart(product),
      ...this.buildPricingParts(product),
    ];
    return this.trimForEmbedding(parts.join('. '));
  }

  private resolveProductPrice(p: ProductPayload): number | null {
    const priceEffective = p.priceEffective;
    const priceFallback = p.price;

    return typeof priceEffective === 'number'
      ? priceEffective
      : priceFallback != null && typeof priceFallback === 'number'
        ? priceFallback
        : null;
  }

  private buildBasicResult(
    item: ScoredRecord<ProductPayload>,
    p: ProductPayload,
  ) {
    return {
      id: String(p.mongoId),
      name: p.name,
      score: item.score ?? 0,
    };
  }

  private assignPricingFields(
    result: Partial<ProductResult>,
    p: ProductPayload,
  ) {
    const price = this.resolveProductPrice(p);
    if (price !== null) result.price = price;
    if (p.priceOld != null) result.priceOld = p.priceOld;
    if (p.priceNew != null) result.priceNew = p.priceNew;
    if (p.discountPct != null) result.discountPct = p.discountPct;
  }

  private assignProductFields(
    result: Partial<ProductResult>,
    p: ProductPayload,
  ) {
    if (p.currency) result.currency = p.currency;
    if (p.categoryName) result.categoryName = p.categoryName;
    if (p.images?.length) result.images = p.images;
    if (p.hasOffer != null && typeof p.hasOffer === 'boolean')
      result.hasOffer = p.hasOffer;
  }

  private assignUrlField(result: Partial<ProductResult>, p: ProductPayload) {
    const url = this.resolveProductUrl(p);
    if (url) result.url = url;
  }

  private buildProductResult(
    item: ScoredRecord<ProductPayload>,
    p: ProductPayload,
  ): ProductResult {
    const result = this.buildBasicResult(item, p);
    this.assignPricingFields(result, p);
    this.assignProductFields(result, p);
    this.assignUrlField(result, p);
    return result;
  }

  private safeJoin(val: unknown, sep = '/'): string {
    const list = this.toStringList(val)
      .map((s) => s.trim())
      .filter(Boolean);
    return list.join(sep);
  }

  private safeJoinComma(val: unknown): string {
    return this.safeJoin(val, ', ');
  }

  private trimForEmbedding(s: string): string {
    const maxChars = Number(
      this.config.get('EMBED_MAX_CHARS') ?? MAX_EMBED_TEXT_FALLBACK,
    );
    return s.length > maxChars ? s.slice(0, maxChars) : s;
  }

  /** ===== Embedding with caching ===== */
  private async embed(text: string): Promise<number[]> {
    const clean = this.trimForEmbedding(text || '');
    const cacheKey = `embedding:${Buffer.from(clean).toString('base64').slice(0, MAX_EMBED_TEXT_FALLBACK)}`;

    const cached = await this.cacheManager.get<number[]>(cacheKey);
    if (Array.isArray(cached) && cached.length === this.dim) return cached;

    try {
      const embedding = await this.embeddings.embed(
        this.embeddingBase,
        clean,
        this.dim,
      );
      if (Array.isArray(embedding) && embedding.length === this.dim) {
        await this.cacheManager.set(cacheKey, embedding, CACHE_TTL_MS);
      }
      return embedding;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Embedding failed for text length ${clean.length}: ${msg}`,
      );
      throw new Error(
        await this.i18n.translate('vector.errors.embeddingFailed'),
      );
    }
  }

  public async embedText(text: string): Promise<number[]> {
    return this.embed(text);
  }

  private resolveProductUrl(p: Partial<ProductPayload>): string | undefined {
    const base = (
      process.env.PUBLIC_WEB_BASE_URL || DEFAULT_PUBLIC_BASE
    ).replace(/\/+$/, '');
    const clean = (s: string) => s.replace(/^https?:\/\//, '');

    if (p.domain && p.slug)
      return `https://${clean(p.domain)}/product/${encodeURIComponent(p.slug)}`;
    if (p.storefrontSlug && p.slug) {
      return `${base}/store/${encodeURIComponent(p.storefrontSlug)}/product/${encodeURIComponent(p.slug)}`;
    }
    if (p.publicUrlStored) {
      try {
        return new URL(p.publicUrlStored, base).toString();
      } catch {
        return p.publicUrlStored;
      }
    }
    if (p.storefrontSlug && p.mongoId) {
      return `${base}/store/${encodeURIComponent(p.storefrontSlug)}/product/${encodeURIComponent(p.mongoId)}`;
    }
    return undefined;
  }

  public async upsertProducts(products: EmbeddableProduct[]): Promise<void> {
    if (!Array.isArray(products) || products.length === 0) return;

    const valid = products.filter((p) => Boolean(p?.id && p?.name));
    if (valid.length !== products.length) {
      this.logger.warn(
        `Filtered out ${products.length - valid.length} invalid products`,
      );
    }

    const batchSize = Math.max(1, this.upsertBatchProducts);
    for (let i = 0; i < valid.length; i += batchSize) {
      const chunk = valid.slice(i, i + batchSize);
      try {
        const records = await Promise.all(
          chunk.map((p) => this.buildProductPoint(p)),
        );
        const validRecords = records.filter(
          (pt) => Array.isArray(pt.values) && pt.values.length === this.dim,
        );
        if (validRecords.length > 0) {
          await this.pinecone.upsert(Collections.Products, validRecords);
          this.logger.log(
            `Upserted ${validRecords.length} product vectors (batch ${i / batchSize + 1})`,
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(
          `Failed to upsert product batch ${i / batchSize + 1}: ${msg}`,
        );
      }
    }
  }

  public async querySimilarProducts(
    text: string,
    merchantId: string,
    topK = 5,
  ): Promise<
    Array<{
      id: string;
      name: string;
      price?: number;
      url?: string;
      score: number;
      currency?: string;
      categoryName?: string;
      images?: string[];
      hasOffer?: boolean;
      priceOld?: number | null;
      priceNew?: number | null;
      discountPct?: number | null;
    }>
  > {
    const vector = await this.embed(text);
    const res = await this.pinecone.query(Collections.Products, {
      vector,
      topK: Math.max(1, topK) * RERANK_MULTIPLIER,
      includeMetadata: true,
      filter: buildEqFilter('merchantId', merchantId),
    });
    const raw =
      (res.matches as ScoredRecord<ProductPayload>[] | undefined) ?? [];

    const filtered = raw.filter((r) =>
      typeof r.score === 'number' ? r.score >= this.minScore : true,
    );
    if (!filtered.length) return [];

    const candidates = filtered.map((item) => {
      const p = item.metadata as ProductPayload;
      return `اسم المنتج: ${p.name ?? ''}${p.price ? ` - السعر: ${p.price}` : ''}`;
    });

    let rerankedIdx: number[] | null = null;
    try {
      const r = await geminiRerankTopN({ query: text, candidates, topN: topK });
      rerankedIdx = this.toRerankedIdx(r, topK);
    } catch {
      // متابعة بدون rerank
    }

    const pick = (i: number) => {
      const item = filtered[i];
      const p = item.metadata as ProductPayload;
      return this.buildProductResult(item, p);
    };

    if (Array.isArray(rerankedIdx) && rerankedIdx.length) {
      return rerankedIdx.filter((i) => i >= 0 && i < filtered.length).map(pick);
    }
    return filtered.slice(0, topK).map((_, idx) => pick(idx));
  }

  /** ===== WEB KNOWLEDGE ===== */
  public generateWebKnowledgeId(merchantId: string, url: string): string {
    if (!merchantId || !url) throw new Error('merchantId or URL is missing');
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        merchantId,
      );
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(merchantId);
    if (!isUUID && !isMongoId)
      throw new Error('merchantId must be UUID or Mongo ObjectId');
    return uuidv5(`${merchantId}-${url}`, Namespaces.Web);
  }

  public async upsertWebKnowledge(
    points: Array<
      Partial<VectorRecord<WebPayload>> & {
        payload: Partial<WebPayload> & { text: unknown; merchantId: unknown };
      }
    >,
  ): Promise<{ success: true }> {
    if (!Array.isArray(points) || points.length === 0) return { success: true };

    const validated: VectorRecord<WebPayload>[] = points.map((p) => ({
      id: p.id ?? uuidv5(String(p.payload.text ?? ''), Namespaces.Product),
      values: Array.isArray(p.values)
        ? p.values
        : Array.isArray((p as { vector?: number[] }).vector)
          ? ((p as { vector?: number[] }).vector as number[])
          : [],
      metadata: this.sanitizeMetadata({
        ...('payload' in p ? (p.payload as Partial<WebPayload>) : {}),
        merchantId: String(p.payload.merchantId ?? ''),
        text: String(p.payload.text ?? '').slice(0, 500),
      }) as WebPayload,
    }));

    const batchSize = Math.max(1, this.upsertBatchWeb);
    for (let i = 0; i < validated.length; i += batchSize) {
      const batch = validated.slice(i, i + batchSize);
      await this.pinecone.upsert(Collections.Web, batch);
      this.logger.log(
        `Upserted web knowledge batch ${i / batchSize + 1}/${Math.ceil(validated.length / batchSize)}`,
      );
    }
    return { success: true };
  }

  async deleteWebKnowledgeByFilter(filter: unknown): Promise<unknown> {
    const pineconeFilter = this.toPineconeFilter(filter);
    if (!pineconeFilter) throw new Error('Invalid delete filter');
    return this.pinecone.deleteByFilter(Collections.Web, pineconeFilter);
  }
  /** ===== BOT FAQs ===== */
  public generateFaqId(faqId: string): string {
    return uuidv5(faqId, Namespaces.FAQ);
  }

  public async upsertBotFaqs(
    points: Array<VectorRecord<BotFaqPayload>>,
  ): Promise<void> {
    if (!Array.isArray(points) || points.length === 0) return;
    const batchSize = Math.max(1, this.upsertBatchWeb);
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize).map((p) => ({
        ...p,
        metadata: this.sanitizeMetadata(
          (p.metadata ?? {}) as Record<string, unknown>,
        ) as BotFaqPayload,
      }));
      await this.pinecone.upsert(Collections.BotFAQs, batch);
    }
  }

  async deleteBotFaqPoint(pointId: string): Promise<unknown> {
    return this.pinecone.deleteMany(Collections.BotFAQs, [pointId]);
  }

  public async searchBotFaqs(
    text: string,
    topK = 5,
  ): Promise<BotFaqSearchItem[]> {
    const vector = await this.embed(text);
    const results = await this.pinecone.query(Collections.BotFAQs, {
      vector,
      topK: Math.max(1, topK),
      includeMetadata: true,
    });

    const matches = (results.matches ?? []) as ScoredRecord<RecordMetadata>[];

    return matches.map((item) => ({
      id: String(item.id),
      question:
        typeof item.metadata?.question === 'string'
          ? item.metadata.question
          : '',
      answer:
        typeof item.metadata?.answer === 'string' ? item.metadata.answer : '',
      score: Number(item.score ?? 0),
    }));
  }

  /** ===== DOCUMENTS ===== */
  async upsertDocumentChunks(
    chunks: Array<{
      id: string;
      vector?: number[];
      payload: Partial<DocChunkPayload> & {
        text?: unknown;
        merchantId?: unknown;
        documentId?: unknown;
      };
    }>,
  ): Promise<void> {
    if (!Array.isArray(chunks) || chunks.length === 0) return;

    const points: VectorRecord<DocChunkPayload>[] = chunks.map((c) => ({
      id: c.id || uuidv5(String(c.payload.text ?? ''), Namespaces.Product),
      values:
        Array.isArray(c.vector) && c.vector.length === this.dim ? c.vector : [],
      metadata: this.sanitizeMetadata({
        merchantId: String(c.payload.merchantId ?? ''),
        documentId: String(c.payload.documentId ?? ''),
        text: String(c.payload.text ?? '').slice(0, MAX_EMBED_TEXT_FALLBACK),
      }),
    }));

    const valid = points.filter(
      (p) => Array.isArray(p.values) && p.values.length === this.dim,
    );
    if (!valid.length) throw new Error('No valid document vectors to upsert');

    const batchSize = Math.max(1, this.upsertBatchDocs);
    for (let i = 0; i < valid.length; i += batchSize) {
      const batch = valid.slice(i, i + batchSize);
      await this.pinecone.upsert(Collections.Documents, batch);
    }
  }

  /** ===== FAQs عامة ===== */
  private async ensureFaqCollection(): Promise<void> {
    await this.pinecone.ensureCollection(Collections.FAQs, this.dim);
  }

  public async upsertFaqs(
    points: Array<VectorRecord<FAQPayload>>,
  ): Promise<void> {
    await this.ensureFaqCollection();
    if (!Array.isArray(points) || points.length === 0) return;
    const batchSize = Math.max(1, this.upsertBatchWeb);
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize).map((p) => ({
        ...p,
        metadata: this.sanitizeMetadata(
          (p.metadata ?? {}) as Record<string, unknown>,
        ) as FAQPayload,
      }));
      await this.pinecone.upsert(Collections.FAQs, batch);
    }
  }

  async deleteFaqsByFilter(filter: unknown): Promise<unknown> {
    const pineconeFilter = this.toPineconeFilter(filter);
    if (!pineconeFilter) throw new Error('Invalid delete filter');
    return this.pinecone.deleteByFilter(Collections.FAQs, pineconeFilter);
  }
  async deleteFaqPointByFaqId(faqMongoId: string): Promise<unknown> {
    const id = this.generateFaqId(faqMongoId);
    return this.pinecone.deleteMany(Collections.FAQs, [id]);
  }

  /** ===== Unified Semantic Search (FAQ + Documents + Web) ===== */
  public async unifiedSemanticSearch(
    text: string,
    merchantId: string,
    topK = 5,
  ): Promise<SearchResult[]> {
    const vector = await this.embed(text);
    const all: SearchResult[] = [];

    const targets: Array<{ name: string; type: 'faq' | 'document' | 'web' }> = [
      { name: Collections.FAQs, type: 'faq' },
      { name: Collections.Documents, type: 'document' },
      { name: Collections.Web, type: 'web' },
    ];

    await Promise.all(
      targets.map(async (t) => {
        try {
          const res = await this.pinecone.query(t.name, {
            vector,
            topK: Math.max(1, topK) * 2,
            includeMetadata: true,
            filter: buildEqFilter('merchantId', merchantId),
          });

          for (const item of (res.matches ??
            []) as ScoredRecord<RecordMetadata>[]) {
            if (typeof item?.score === 'number' && item.score < this.minScore)
              continue;
            all.push({
              type: t.type,
              score: typeof item.score === 'number' ? item.score : 0,
              data:
                (item.metadata as
                  | FAQData
                  | DocumentData
                  | WebData
                  | undefined) ?? {},
              id: item.id,
            });
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`[unifiedSemanticSearch] ${t.name} failed: ${msg}`);
        }
      }),
    );

    if (!all.length) return [];

    const candidates = all.map((r) =>
      r.type === 'faq'
        ? `${(r.data as FAQData).question ?? ''} - ${(r.data as FAQData).answer ?? ''}`
        : `${(r.data as DocumentData | WebData).text ?? ''}`,
    );

    try {
      const rr = await geminiRerankTopN({
        query: text,
        candidates,
        topN: topK,
      });
      const idx = this.toRerankedIdx(rr, topK);
      if (idx && idx.length) {
        return idx
          .filter((i) => i >= 0 && i < all.length)
          .slice(0, topK)
          .map((i) => all[i]);
      }
    } catch {
      // استخدم ترتيب Pinecone الأصلي
    }

    return all.slice(0, topK);
  }

  /** ===== PRODUCTS — DELETE ===== */
  public async deleteProductPointsByMongoIds(
    ids: Array<string | { toString(): string }>,
  ): Promise<void> {
    const pointIds = ids
      .map((x) => (typeof x === 'string' ? x : x.toString()))
      .filter((s) => s.length > 0)
      .map((id) => qdrantIdForProduct(id));
    if (!pointIds.length) return;
    await this.pinecone.deleteMany(Collections.Products, pointIds);
  }

  public async deleteProductsByMerchant(merchantId: string): Promise<void> {
    await this.pinecone.deleteByFilter(
      Collections.Products,
      buildEqFilter('merchantId', merchantId),
    );
  }

  public async deleteProductsByCategory(
    merchantId: string,
    categoryId: string,
  ): Promise<void> {
    await this.pinecone.deleteByFilter(Collections.Products, {
      ...buildEqFilter('merchantId', merchantId),
      ...buildEqFilter('categoryId', categoryId),
    });
  }

  public async deleteProductByMongoId(mongoId: string): Promise<void> {
    await this.pinecone.deleteByFilter(
      Collections.Products,
      buildEqFilter('mongoId', mongoId),
    );
  }

  public async deleteProductPoint(
    ids: Array<string | { toString(): string }>,
  ): Promise<void> {
    await this.deleteProductPointsByMongoIds(ids);
  }

  public async deleteProductPoints(
    ids: Array<string | { toString(): string }>,
  ): Promise<void> {
    await this.deleteProductPointsByMongoIds(ids);
  }

  /** واجهة توافقية للاختبارات القديمة */
  public async searchProductsCompat(
    query: string,
    merchantId?: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      price?: number;
      url?: string;
      score: number;
      currency?: string;
      categoryName?: string;
      images?: string[];
      hasOffer?: boolean;
      priceOld?: number | null;
      priceNew?: number | null;
      discountPct?: number | null;
    }>
  > {
    return this.querySimilarProducts(query, merchantId || '', 20);
  }

  /** واجهة اختبارية */
  public __test_embed(input: string): Promise<number[]> {
    return this.embed(input);
  }
}
