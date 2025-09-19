// src/vector/vector.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';

import { QdrantWrapper } from './utils/qdrant.client';
import { EmbeddingsClient } from './utils/embeddings.client';
import { Collections, Namespaces } from './utils/collections';

import {
  BotFaqSearchItem,
  DocumentData,
  EmbeddableProduct,
  FAQData,
  SearchResult,
  WebData,
} from './utils/types';
import { geminiRerankTopN } from './utils/geminiRerank';

// ===== Helpers ثابتة للـ UUID =====
const qdrantIdForProduct = (mongoId: any) =>
  uuidv5(String(mongoId), Namespaces.Product);

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
    private readonly qdrant: QdrantWrapper,
    private readonly embeddings: EmbeddingsClient,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.embeddingBase = (
      this.config.get<string>('EMBEDDING_BASE_URL') || ''
    ).replace(/\/+$/, '');
    if (!this.embeddingBase) throw new Error('EMBEDDING_BASE_URL is required');

    this.dim = Number(this.config.get('EMBEDDING_DIM') ?? 384);

    // أحجام الدُفعات
    this.upsertBatchProducts = Number(
      this.config.get('VECTOR_UPSERT_BATCH_PRODUCTS') ?? 10,
    );
    this.upsertBatchWeb = Number(
      this.config.get('VECTOR_UPSERT_BATCH_WEB') ?? 10,
    );
    this.upsertBatchDocs = Number(
      this.config.get('VECTOR_UPSERT_BATCH_DOCS') ?? 2,
    );

    // حد أدنى للنتيجة من Qdrant (قبل عرض النتائج)
    this.minScore = Number(this.config.get('VECTOR_MIN_SCORE') ?? 0);
  }

  // ===== Lifecycle =====
  public async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('QDRANT_URL');
    if (!url) throw new Error('QDRANT_URL is required');
    this.qdrant.init(url);

    await this.ensureCollections();
    this.logger.log(
      `VectorService initialized (dim=${this.dim}, minScore=${this.minScore})`,
    );
  }

  private async ensureCollections(): Promise<void> {
    await Promise.all([
      this.qdrant.ensureCollection(Collections.Products, this.dim),
      this.qdrant.ensureCollection(Collections.Offers, this.dim),
      this.qdrant.ensureCollection(Collections.FAQs, this.dim),
      this.qdrant.ensureCollection(Collections.Documents, this.dim),
      this.qdrant.ensureCollection(Collections.Web, this.dim),
      this.qdrant.ensureCollection(Collections.BotFAQs, this.dim),
    ]);
  }

  // ===== Utilities: نصوص آمنة وقصّ الطول =====
  private toStringList(
    val: any,
    seen: WeakSet<any> = new WeakSet(),
    depth = 0,
  ): string[] {
    const MAX_DEPTH = 4;

    const pushSafeJson = (v: any) => {
      try {
        return [JSON.stringify(v).slice(0, 200)];
      } catch {
        return [String(v)];
      }
    };

    const isBufferLike = (v: any) =>
      v?.type === 'Buffer' && Array.isArray(v?.data);
    const isMongoObjectIdHex = (s: string) => /^[a-f0-9]{24}$/i.test(s);

    if (val == null) return [];
    const t = typeof val;

    if (t === 'string' || t === 'number' || t === 'boolean')
      return [String(val)];
    if (depth >= MAX_DEPTH) return pushSafeJson(val);

    if (Array.isArray(val)) {
      const out: string[] = [];
      for (const item of val)
        out.push(...this.toStringList(item, seen, depth + 1));
      return out;
    }

    if (t === 'object') {
      if (seen.has(val)) return ['[Circular]'];
      seen.add(val);

      if (val instanceof Date) return [val.toISOString()];
      if (typeof (val as any).toHexString === 'function')
        return [(val as any).toHexString()];
      if (isBufferLike(val)) return [`[Buffer:${val.data.length}]`];

      if (typeof (val as any).toString === 'function') {
        const s = (val as any).toString();
        if (isMongoObjectIdHex(s)) return [s];
      }

      const values = Object.values(val);
      if (!values.length) return pushSafeJson(val);

      const out: string[] = [];
      for (const v of values)
        out.push(...this.toStringList(v, seen, depth + 1));
      return out;
    }

    return [String(val)];
  }

  private safeJoin(val: any, sep = '/'): string {
    const list = this.toStringList(val)
      .map((s) => s.trim())
      .filter(Boolean);
    return list.join(sep);
  }
  private safeJoinComma(val: any): string {
    return this.safeJoin(val, ', ');
  }

  private trimForEmbedding(s: string): string {
    const MAX_EMBED_TEXT = Number(this.config.get('EMBED_MAX_CHARS') ?? 3000);
    return s.length > MAX_EMBED_TEXT ? s.slice(0, MAX_EMBED_TEXT) : s;
  }

  // ===== Embedding with caching =====
  private async embed(text: string): Promise<number[]> {
    const clean = this.trimForEmbedding(text || '');

    // Cache embeddings for frequently used texts
    const cacheKey = `embedding:${Buffer.from(clean).toString('base64').slice(0, 50)}`;
    const cached = await this.cacheManager.get<number[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length === this.dim) {
      return cached;
    }

    try {
      const embedding = await this.embeddings.embed(
        this.embeddingBase,
        clean,
        this.dim,
      );

      // Cache for 1 hour for frequently used embeddings
      if (embedding && embedding.length === this.dim) {
        await this.cacheManager.set(cacheKey, embedding, 3600000);
      }

      return embedding;
    } catch (error) {
      this.logger.error(
        `Embedding failed for text length ${clean.length}`,
        error,
      );
      throw new Error(
        await this.i18n.translate('vector.errors.embeddingFailed'),
      );
    }
  }

  public async embedText(text: string): Promise<number[]> {
    return this.embed(text); // تستدعي الدالة الخاصة مع كل الضوابط/القصّ
  }
  // ====== PRODUCTS ======
  private buildTextForEmbedding(product: EmbeddableProduct): string {
    const parts: string[] = [];

    if (product.name) parts.push(`Name: ${product.name}`);
    if (product.description) parts.push(`Description: ${product.description}`);

    if (product.categoryId || product.categoryName) {
      parts.push(
        `Category: ${this.safeJoin(product.categoryName ?? product.categoryId)}`,
      );
    }

    if (product.specsBlock && this.toStringList(product.specsBlock).length) {
      parts.push(`Specs: ${this.safeJoinComma(product.specsBlock)}`);
    }

    if (product.attributes) {
      const attrs = Object.entries(product.attributes).map(
        ([k, v]) => `${k}: ${this.safeJoin(v, '/')}`,
      );
      if (attrs.length) parts.push(`Attributes: ${attrs.join('; ')}`);
    }

    if (product.keywords && this.toStringList(product.keywords).length) {
      parts.push(`Keywords: ${this.safeJoinComma(product.keywords)}`);
    }

    if (
      product.hasActiveOffer &&
      product.priceOld != null &&
      product.priceNew != null
    ) {
      parts.push(`Offer: from ${product.priceOld} to ${product.priceNew}`);
    }

    if (product.price != null) {
      parts.push(`Price: ${product.price} ${product.currency || ''}`.trim());
    }

    return this.trimForEmbedding(parts.join('. '));
  }

  private resolveProductUrl(p: any): string | undefined {
    const base = (
      process.env.PUBLIC_WEB_BASE_URL || 'https://kaleem-ai.com'
    ).replace(/\/+$/, '');
    const clean = (s: string) => s.replace(/^https?:\/\//, '');
    if (p?.domain && p?.slug) {
      return `https://${clean(p.domain)}/product/${encodeURIComponent(p.slug)}`;
    }
    if (p?.storefrontSlug && p?.slug) {
      return `${base}/store/${encodeURIComponent(p.storefrontSlug)}/product/${encodeURIComponent(p.slug)}`;
    }
    if (p?.publicUrlStored) {
      try {
        return new URL(p.publicUrlStored, base).toString();
      } catch {
        return p.publicUrlStored;
      }
    }
    if (p?.storefrontSlug && p?.mongoId) {
      return `${base}/store/${encodeURIComponent(p.storefrontSlug)}/product/${encodeURIComponent(p.mongoId)}`;
    }
    return undefined;
  }

  public async upsertProducts(products: EmbeddableProduct[]) {
    if (!products?.length) return;

    // Input validation
    const validProducts = products.filter((p) => p?.id && p?.name);
    if (validProducts.length !== products.length) {
      this.logger.warn(
        `Filtered out ${products.length - validProducts.length} invalid products`,
      );
    }

    // ابنِ النقاط على دفعات
    const buildPoint = async (p: EmbeddableProduct) => {
      try {
        // احذف أي نقاط سابقة بهذا mongoId
        await this.qdrant
          .delete(Collections.Products, {
            filter: { must: [{ key: 'mongoId', match: { value: p.id } }] },
          })
          .catch(() => {});

        const discountPct =
          p.priceOld && p.priceNew && p.priceOld > 0
            ? Math.max(
                0,
                Math.round(((p.priceOld - p.priceNew) / p.priceOld) * 100),
              )
            : null;

        const vectorText = this.buildTextForEmbedding({
          ...p,
          discountPct: discountPct ?? undefined,
        });
        const vector = await this.embed(vectorText);

        return {
          id: qdrantIdForProduct(p.id),
          vector,
          payload: {
            mongoId: p.id,
            merchantId: p.merchantId,
            // معلومات للوكيل
            name: p.name,
            description: p.description ?? '',
            categoryId: p.categoryId ?? null,
            categoryName: p.categoryName ?? null,
            specsBlock: p.specsBlock ?? [],
            keywords: p.keywords ?? [],
            images: p.images ?? [],
            // روابط
            slug: p.slug ?? null,
            storefrontSlug: p.storefrontSlug ?? null,
            domain: p.domain ?? null,
            publicUrlStored: p.publicUrlStored ?? null,
            // أسعار وعروض
            price: Number.isFinite(p.price as number)
              ? (p.price as number)
              : null,
            priceEffective: Number.isFinite(p.priceEffective as number)
              ? (p.priceEffective as number)
              : null,
            currency: p.currency ?? null,
            hasOffer: !!p.hasActiveOffer,
            priceOld: p.priceOld ?? null,
            priceNew: p.priceNew ?? null,
            offerStart: p.offerStart ?? null,
            offerEnd: p.offerEnd ?? null,
            discountPct,
            // حالة
            isAvailable:
              typeof p.isAvailable === 'boolean' ? p.isAvailable : null,
            status: p.status ?? null,
            quantity: p.quantity ?? null,
          },
        };
      } catch (error) {
        this.logger.error(`Failed to build point for product ${p.id}`, error);
        throw error;
      }
    };

    const batchSize = Math.max(1, this.upsertBatchProducts);
    for (let i = 0; i < validProducts.length; i += batchSize) {
      const chunk = validProducts.slice(i, i + batchSize);
      try {
        const points = await Promise.all(chunk.map(buildPoint));
        const validPoints = points.filter(
          (p) => p && p.vector && p.vector.length === this.dim,
        );

        if (validPoints.length > 0) {
          await this.qdrant.upsert(Collections.Products, {
            wait: true,
            points: validPoints,
          });
          this.logger.log(
            `Upserted ${validPoints.length} product vectors (batch ${i / batchSize + 1})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to upsert product batch ${i / batchSize + 1}`,
          error,
        );
        throw error;
      }
    }
  }

  public async querySimilarProducts(
    text: string,
    merchantId: string,
    topK = 5,
  ) {
    const vector = await this.embed(text);
    const raw = await this.qdrant.search(Collections.Products, {
      vector,
      limit: Math.max(1, topK) * 4,
      with_payload: true,
      filter: { must: [{ key: 'merchantId', match: { value: merchantId } }] },
    });

    const filtered = (raw || []).filter((r: any) =>
      typeof r?.score === 'number' ? r.score >= this.minScore : true,
    );
    if (!filtered.length) return [];

    const candidates = filtered.map((item: any) => {
      const p = item.payload as any;
      return `اسم المنتج: ${p.name ?? ''}${p.price ? ` - السعر: ${p.price}` : ''}`;
    });

    // Rerank (اختياري)
    let rerankedIdx: number[] | null = null;
    try {
      const r = await geminiRerankTopN({ query: text, candidates, topN: topK });
      if (Array.isArray(r) && r.length) {
        if (typeof r[0] === 'number') rerankedIdx = r as number[];
        else if (
          typeof (r as any)[0] === 'object' &&
          'index' in (r as any)[0]
        ) {
          rerankedIdx = (
            r as unknown as Array<{ index: number; score?: number }>
          )
            .map((x) => x.index)
            .slice(0, topK);
        }
      }
    } catch {
      // أكمل بدون Rerank
    }

    const pick = (i: number) => {
      const item = filtered[i];
      const p = item.payload as any;
      const url = this.resolveProductUrl(p);

      return {
        id: String(p.mongoId),
        name: p.name,
        price:
          typeof p.priceEffective === 'number' ? p.priceEffective : p.price,
        url,
        score: item.score ?? 0,
        currency: p.currency ?? undefined,
        categoryName: p.categoryName ?? undefined,
        images: p.images ?? undefined,
        hasOffer: p.hasOffer ?? undefined,
        priceOld: p.priceOld ?? undefined,
        priceNew: p.priceNew ?? undefined,
        discountPct: p.discountPct ?? undefined,
      };
    };

    if (rerankedIdx && rerankedIdx.length) {
      return rerankedIdx
        .filter((i) => i >= 0 && i < filtered.length)
        .slice(0, topK)
        .map(pick);
    }
    return filtered.slice(0, topK).map((_, idx) => pick(idx));
  }

  // ====== WEB KNOWLEDGE ======
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

  public async upsertWebKnowledge(points: any[]) {
    if (!points?.length) return { success: true };

    const validated = points.map((p) => ({
      id: p.id || uuidv5(p.payload.text, Namespaces.Product), // نصيحة: غيّر الـ namespace لو حبيت
      vector: p.vector,
      payload: {
        ...p.payload,
        merchantId: p.payload.merchantId?.toString(),
        text: (p.payload.text ?? '').toString().substring(0, 500),
      },
    }));

    const batchSize = Math.max(1, this.upsertBatchWeb);
    for (let i = 0; i < validated.length; i += batchSize) {
      const batch = validated.slice(i, i + batchSize);
      await this.qdrant.upsert(Collections.Web, { wait: true, points: batch });
      this.logger.log(
        `Upserted web knowledge batch ${i / batchSize + 1}/${Math.ceil(validated.length / batchSize)}`,
      );
    }
    return { success: true };
  }

  async deleteWebKnowledgeByFilter(filter: any) {
    return this.qdrant.delete(Collections.Web, { filter });
  }

  // ====== BOT FAQs ======
  public generateFaqId(faqId: string) {
    return uuidv5(faqId, Namespaces.FAQ);
  }

  public async upsertBotFaqs(points: any[]) {
    if (!points?.length) return;
    const batchSize = Math.max(1, this.upsertBatchWeb);
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.qdrant.upsert(Collections.BotFAQs, {
        wait: true,
        points: batch,
      });
    }
  }

  async deleteBotFaqPoint(pointId: string) {
    return this.qdrant.delete(Collections.BotFAQs, { points: [pointId] });
  }

  public async searchBotFaqs(
    text: string,
    topK = 5,
  ): Promise<BotFaqSearchItem[]> {
    const vector = await this.embed(text);
    const results = await this.qdrant.search(Collections.BotFAQs, {
      vector,
      limit: topK,
      with_payload: true,
    });

    return (results || []).map((item: any) => ({
      id: String(item.id),
      question:
        typeof item.payload?.question === 'string' ? item.payload.question : '',
      answer:
        typeof item.payload?.answer === 'string' ? item.payload.answer : '',
      score: Number(item.score ?? 0),
    }));
  }

  // ====== DOCUMENTS ======
  async upsertDocumentChunks(
    chunks: { id: string; vector: number[]; payload: any }[],
  ): Promise<void> {
    if (!chunks?.length) return;

    const points = chunks.map((c) => ({
      id: c.id || uuidv5(c.payload.text, Namespaces.Product),
      vector:
        Array.isArray(c.vector) && c.vector.length === this.dim ? c.vector : [],
      payload: {
        merchantId: String(c.payload.merchantId ?? ''),
        documentId: String(c.payload.documentId ?? ''),
        text: (c.payload.text ?? '').toString().slice(0, 2000),
      },
    }));

    const valid = points.filter(
      (p) => Array.isArray(p.vector) && p.vector.length === this.dim,
    );
    if (!valid.length) throw new Error('No valid document vectors to upsert');

    const batchSize = Math.max(1, this.upsertBatchDocs);
    for (let i = 0; i < valid.length; i += batchSize) {
      const batch = valid.slice(i, i + batchSize);
      await this.qdrant.upsert(Collections.Documents, {
        wait: true,
        points: batch,
      });
    }
  }

  // ====== FAQs عامة ======
  private async ensureFaqCollection() {
    // لم تعد ضرورية مع ensureCollections، أبقيناها توافقًا للخلف
    await this.qdrant.ensureCollection(Collections.FAQs, this.dim);
  }

  public async upsertFaqs(points: any[]) {
    await this.ensureFaqCollection();
    if (!points?.length) return;
    const batchSize = Math.max(1, this.upsertBatchWeb);
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.qdrant.upsert(Collections.FAQs, { wait: true, points: batch });
    }
  }

  async deleteFaqsByFilter(filter: any) {
    return this.qdrant.delete(Collections.FAQs, { filter });
  }

  async deleteFaqPointByFaqId(faqMongoId: string) {
    const id = this.generateFaqId(faqMongoId);
    return this.qdrant.delete(Collections.FAQs, { points: [id] });
  }

  // ====== Unified Semantic Search (FAQ + Documents + Web) ======
  public async unifiedSemanticSearch(
    text: string,
    merchantId: string,
    topK = 5,
  ): Promise<SearchResult[]> {
    const vector = await this.embed(text);
    const all: SearchResult[] = [];

    const targets: { name: string; type: 'faq' | 'document' | 'web' }[] = [
      { name: Collections.FAQs, type: 'faq' },
      { name: Collections.Documents, type: 'document' },
      { name: Collections.Web, type: 'web' },
    ];

    await Promise.all(
      targets.map(async (t) => {
        try {
          const res = await this.qdrant.search(t.name, {
            vector,
            limit: Math.max(1, topK) * 2,
            with_payload: true,
            filter: {
              must: [{ key: 'merchantId', match: { value: merchantId } }],
            },
          });
          for (const item of res || []) {
            if (typeof item?.score === 'number' && item.score < this.minScore)
              continue;
            all.push({
              type: t.type,
              score: item.score,
              data: (item.payload ?? {}) as FAQData | DocumentData | WebData,
              id: item.id,
            });
          }
        } catch (e: any) {
          this.logger.warn(
            `[unifiedSemanticSearch] ${t.name} failed: ${e?.message ?? e}`,
          );
        }
      }),
    );

    if (!all.length) return [];

    const candidates = all.map((r) => {
      if (r.type === 'faq')
        return `${(r.data as FAQData).question ?? ''} - ${(r.data as FAQData).answer ?? ''}`;
      return `${(r.data as DocumentData | WebData).text ?? ''}`;
    });

    try {
      const rr = await geminiRerankTopN({
        query: text,
        candidates,
        topN: topK,
      });
      if (Array.isArray(rr) && rr.length) {
        // إذا كانت مصفوفة فهارس مباشرة
        if (typeof rr[0] === 'number') {
          return (rr as number[])
            .filter((i) => i >= 0 && i < all.length)
            .slice(0, topK)
            .map((i) => all[i]);
        }
        // أو كائنات {index, score}
        if (typeof (rr as any)[0] === 'object' && 'index' in (rr as any)[0]) {
          return (rr as unknown as Array<{ index: number; score?: number }>)
            .map((r) => r.index)
            .filter((i) => i >= 0 && i < all.length)
            .slice(0, topK)
            .map((i) => all[i]);
        }
      }
    } catch {
      // استخدم ترتيب Qdrant الأصلي
    }

    return all.slice(0, topK);
  }

  // ====== PRODUCTS — DELETE ======
  /** احذف نقطة/نقاط منتجات عبر معرف Mongo (point id = uuidv5(mongoId, Namespaces.Product)) */
  public async deleteProductPointsByMongoIds(
    ids: Array<string | { toString(): string }>,
  ) {
    const pointIds = ids
      .map((x) => (typeof x === 'string' ? x : x.toString()))
      .filter(Boolean)
      .map((id) => qdrantIdForProduct(id));

    if (!pointIds.length) return;
    await this.qdrant.delete(Collections.Products, { points: pointIds });
  }

  /** احذف كل منتجات تاجر معيّن بالفلتر */
  public async deleteProductsByMerchant(merchantId: string) {
    await this.qdrant.delete(Collections.Products, {
      filter: { must: [{ key: 'merchantId', match: { value: merchantId } }] },
    });
  }

  /** احذف منتجات تاجر داخل تصنيف معيّن */
  public async deleteProductsByCategory(
    merchantId: string,
    categoryId: string,
  ) {
    await this.qdrant.delete(Collections.Products, {
      filter: {
        must: [
          { key: 'merchantId', match: { value: merchantId } },
          { key: 'categoryId', match: { value: categoryId } },
        ],
      },
    });
  }

  /** احذف منتج واحد باستخدام mongoId (فلتر على payload) */
  public async deleteProductByMongoId(mongoId: string) {
    await this.qdrant.delete(Collections.Products, {
      filter: { must: [{ key: 'mongoId', match: { value: mongoId } }] },
    });
  }

  public async deleteProductPoint(ids: Array<string | { toString(): string }>) {
    // بعض الاختبارات كانت تسميه بالمفرد وهو يستقبل array
    return this.deleteProductPointsByMongoIds(ids);
  }

  // ✅ أحيانًا اسم الجمع:
  public async deleteProductPoints(
    ids: Array<string | { toString(): string }>,
  ) {
    return this.deleteProductPointsByMongoIds(ids);
  }

  // ✅ لو كان في اختبارات قديمة تتوقع searchProducts بتوقيع مختلف:
  public async searchProductsCompat(query: string, merchantId?: string) {
    // استدعِ ما يلائم داخليًا عندك
    return this.querySimilarProducts(query, merchantId || '', 20);
  }
  public __test_embed(input: string) {
    // واجهة اختبارية تستدعي الخاصّة داخليًا
    return this.embed(input as any);
  }
}
