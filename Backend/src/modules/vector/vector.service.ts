import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  BotFaqSearchItem,
  DocumentData,
  EmbeddableProduct,
  FAQData,
  SearchResult,
  WebData,
} from './types';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { v5 as uuidv5 } from 'uuid';
import { ProductsService } from '../products/products.service';
import { geminiRerankTopN } from './geminiRerank';
import { ConfigService } from '@nestjs/config';
const PRODUCT_NAMESPACE = 'd94a5f5a-2bfc-4c2d-9f10-1234567890ab';
const FAQ_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

const qdrantIdFor = (mongoId: any) =>
  uuidv5(String(mongoId), PRODUCT_NAMESPACE);

@Injectable()
export class VectorService implements OnModuleInit {
  private qdrant: QdrantClient;
  private readonly collection = 'products';
  private readonly offerCollection = 'offers';
  public readonly faqCollection = 'faqs';
  private readonly documentCollection = 'documents';
  private readonly botFaqCollection = 'bot_faqs'; // 👈 كولكشن منفصل لقاعدة معرفة كليم
  private readonly embeddingBase: string;

  private readonly webCollection = 'web_knowledge'; // 👈 مجموعات جديدة
  private readonly logger = new Logger(VectorService.name);
  // استبدل النسخة القديمة بالكامل بهذه
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

    // بدالات خاصة لبعض الأنواع الشائعة
    const isBufferLike = (v: any) =>
      v?.type === 'Buffer' && Array.isArray(v?.data);
    const isMongoObjectIdHex = (s: string) => /^[a-f0-9]{24}$/i.test(s);

    if (val == null) return [];
    const t = typeof val;

    // primitives
    if (t === 'string' || t === 'number' || t === 'boolean')
      return [String(val)];

    // حد أقصى للعمق
    if (depth >= MAX_DEPTH) return pushSafeJson(val);

    // arrays
    if (Array.isArray(val)) {
      const out: string[] = [];
      for (const item of val)
        out.push(...this.toStringList(item, seen, depth + 1));
      return out;
    }

    // objects
    if (t === 'object') {
      // حارس الدوائر
      if (seen.has(val)) return ['[Circular]'];
      seen.add(val);

      // حالات خاصة
      if (val instanceof Date) return [val.toISOString()];
      if (typeof (val as any).toHexString === 'function')
        return [(val as any).toHexString()];
      if (isBufferLike(val)) return [`[Buffer:${val.data.length}]`];

      // أحيانًا toString يرجّع ObjectId كسلسلة 24 hex
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

    // fallback
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

  constructor(
    private readonly http: HttpService,
    @Inject(forwardRef(() => ProductsService)) // ← أضف هذه السطر
    private readonly productsService: ProductsService,
    private config: ConfigService,
    // 👈 وأيضًا هذا لو استخدمته
  ) {
    this.embeddingBase = (
      this.config.get<string>('EMBEDDING_BASE_URL') || ''
    ).replace(/\/+$/, '');
    if (!this.embeddingBase) {
      throw new Error('EMBEDDING_BASE_URL is required');
    }
  }
  public async onModuleInit(): Promise<void> {
    this.qdrant = new QdrantClient({ url: process.env.QDRANT_URL });
    console.log('[VectorService] Qdrant URL is', process.env.QDRANT_URL);
    const collections = await this.qdrant.getCollections();
    this.logger.log(`Available collections: ${JSON.stringify(collections)}`);
    await this.ensureCollections();
  }

  private async ensureCollections(): Promise<void> {
    const existing = await this.qdrant.getCollections();
    const requiredCollections = [
      this.collection,
      this.offerCollection,
      this.faqCollection,
      this.webCollection,
      this.documentCollection,
      this.botFaqCollection, // 👈 إضافة كولكشن جديدة
    ];

    for (const coll of requiredCollections) {
      if (!existing.collections.find((c) => c.name === coll)) {
        await this.qdrant.createCollection(coll, {
          vectors: {
            size: 384,
            distance: 'Cosine',
          },
        });
      }
    }
  }
  public async upsertBotFaqs(points: any[]) {
    // تأكد من وجود الكولكشن
    const existing = await this.qdrant.getCollections();
    if (!existing.collections.find((c) => c.name === this.botFaqCollection)) {
      await this.qdrant.createCollection(this.botFaqCollection, {
        vectors: { size: 384, distance: 'Cosine' },
      });
    }
    return this.qdrant.upsert(this.botFaqCollection, { wait: true, points });
  }

  async deleteWebKnowledgeByFilter(filter: any) {
    // @qdrant/js-client-rest يدعم:
    // client.delete(collection, { filter })
    return this.qdrant.delete(this.webCollection, { filter });
  }

  async deleteFaqsByFilter(filter: any) {
    return this.qdrant.delete(this.faqCollection, { filter });
  }

  // حذف نقطة FAQ واحدة بواسطة faqId (Mongo) باستخدام generateFaqId
  async deleteFaqPointByFaqId(faqMongoId: string) {
    const id = this.generateFaqId(faqMongoId);
    return this.qdrant.delete(this.faqCollection, { points: [id] });
  }

  // vector.service.ts
  public async embed(text: string): Promise<number[]> {
    const embeddingUrl = this.embeddingBase; // تأكد من إزالة المسافة الأولى قبل http
    try {
      console.log('🔤 Embedding text length:', text.length);
      console.log('🌐 Sending to Embedding URL:', `${embeddingUrl}/embed`);
      console.log('📦 Payload:', { texts: [text] });

      const response = await firstValueFrom(
        this.http.post<{ embeddings: number[][] }>(`${embeddingUrl}/embed`, {
          texts: [text],
        }),
      );

      console.log('✅ Embedding response received:', response.data);

      const embedding = response.data.embeddings[0];

      // تحقق من أن المتجه موجود ويحتوي على 384 عنصر
      if (!embedding || embedding.length !== 384) {
        throw new Error(`Invalid embedding length: ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      console.error(
        '❌ Embedding error:',
        error.response?.data || error.message,
      );
      throw new Error(`Bad Request: ${error.response?.data || error.message}`);
    }
  }
  // في upsertWebKnowledge()
  public async upsertWebKnowledge(points: any[]) {
    try {
      this.logger.log(`Attempting to upsert ${points.length} points`, {
        samplePoint: points[0], // تسجيل عينة من البيانات المرسلة
      });

      // التحقق من صحة البيانات قبل الإرسال
      const validatedPoints = points.map((point) => ({
        id: point.id || uuidv5(point.payload.text, PRODUCT_NAMESPACE),
        vector: point.vector,
        payload: {
          ...point.payload,
          merchantId: point.payload.merchantId?.toString(),
          text: point.payload.text?.substring(0, 500),
        },
      }));

      // التقسيم إلى دفعات صغيرة إذا لزم الأمر
      const batchSize = 10;
      for (let i = 0; i < validatedPoints.length; i += batchSize) {
        const batch = validatedPoints.slice(i, i + batchSize);

        await this.qdrant.upsert(this.webCollection, {
          wait: true,
          points: batch,
        });

        this.logger.log(
          `Upserted batch ${i / batchSize + 1} of ${Math.ceil(validatedPoints.length / batchSize)}`,
        );
      }

      this.logger.log('Upsert completed successfully');
      return { success: true };
    } catch (error) {
      this.logger.error('Full upsert error details:', {
        error: {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
        },
        pointsCount: points.length,
        samplePoint: points[0],
      });
      throw error;
    }
  }
  async upsertDocumentChunks(
    chunks: { id: string; vector: number[]; payload: any }[],
  ): Promise<void> {
    if (!chunks.length) return;

    // نظف كل payload
    const points = chunks.map((chunk) => ({
      id: chunk.id || uuidv5(chunk.payload.text, PRODUCT_NAMESPACE),
      vector: chunk.vector.length === 384 ? chunk.vector : [],
      payload: {
        merchantId: String(chunk.payload.merchantId ?? ''),
        documentId: String(chunk.payload.documentId ?? ''),
        text: (chunk.payload.text ?? '').toString().slice(0, 2000), // قلل الحجم للتجربة
      },
    }));

    // لا ترفع إذا vector فاضي أو خاطئ
    const validPoints = points.filter(
      (p) => Array.isArray(p.vector) && p.vector.length === 384,
    );

    if (!validPoints.length) throw new Error('No valid points to upsert!');

    const batchSize = 2;
    for (let i = 0; i < validPoints.length; i += batchSize) {
      const batch = validPoints.slice(i, i + batchSize);
      await this.qdrant.upsert(this.documentCollection, {
        wait: true,
        points: batch,
      });
    }
  }
  async deleteBotFaqPoint(pointId: string) {
    // REST client:
    return this.qdrant.delete(this.botFaqCollection, { points: [pointId] });
  }
  public async upsertProducts(products: EmbeddableProduct[]) {
    const points = await Promise.all(
      products.map(async (p) => {
        // احذف أي نقاط سابقة بهذا mongoId (سواء نفس الـid أو قديم)
        await this.qdrant
          .delete(this.collection, {
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

        return {
          id: qdrantIdFor(p.id), // 👈 ثابت 100%
          vector: await this.embed(vectorText),
          payload: {
            mongoId: p.id,
            merchantId: p.merchantId,
            // معلومات كاملة للبوت
            name: p.name,
            description: p.description ?? '',
            categoryId: p.categoryId ?? null,
            categoryName: p.categoryName ?? null,
            specsBlock: p.specsBlock ?? [],
            keywords: p.keywords ?? [],
            images: p.images ?? [],
            // روابط وسلاج
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
      }),
    );

    return this.qdrant.upsert(this.collection, { wait: true, points });
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

  public async querySimilarProducts(
    text: string,
    merchantId: string,
    topK = 5,
  ) {
    // 1) Embed للاستعلام
    const vector = await this.embed(text);

    // 2) بحث في Qdrant
    const rawResults = await this.qdrant.search(this.collection, {
      vector,
      limit: topK * 4,
      // خذ كل شيء أو على الأقل أضف الحقول الجديدة
      with_payload: true, // 👈 أسهل حل
      filter: { must: [{ key: 'merchantId', match: { value: merchantId } }] },
    });

    if (!rawResults.length) return [];

    // 3) نصوص المرشحين لإعادة الترتيب (اختياري)
    const candidates = rawResults.map((item) => {
      const p = item.payload as any;
      // نص بسيط يكفي لإعادة الترتيب
      return `اسم المنتج: ${p.name ?? ''}${p.price ? ` - السعر: ${p.price}` : ''}`;
    });

    // 4) إعادة ترتيب عبر Gemini (إن متاح). الدالة قد تعيد:
    //    - مصفوفة فهارس [2,0,1,...] أو
    //    - مصفوفة كائنات { index, score }
    let rerankedIdx: number[] | null = null;
    try {
      const geminiResult = await geminiRerankTopN({
        query: text,
        candidates,
        topN: topK,
      });

      if (Array.isArray(geminiResult) && geminiResult.length) {
        if (typeof geminiResult[0] === 'number') {
          rerankedIdx = geminiResult as number[];
        } else if (
          typeof geminiResult[0] === 'object' &&
          'index' in (geminiResult[0] as any)
        ) {
          rerankedIdx = (
            geminiResult as unknown as Array<{ index: number; score?: number }>
          )
            .map((r) => r.index)
            .slice(0, topK);
        }
      }
    } catch {
      // لو فشل إعادة الترتيب، نكمل بالترتيب الأصلي القادم من Qdrant
    }

    // 5) إبراز أفضل Top K
    const pick = (i: number) => {
      const item = rawResults[i];
      const p = item.payload as any;

      // ابنِ رابطًا مطلقًا للبوت
      const url = this.resolveProductUrl(p); // 👈 أنشئها تحت (3)

      return {
        id: String(p.mongoId),
        name: p.name,
        price:
          typeof p.priceEffective === 'number' ? p.priceEffective : p.price,
        url,
        score: item.score ?? 0,
        // وزّع بقية الحقول للبوت
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
        .filter((i) => i >= 0 && i < rawResults.length)
        .slice(0, topK)
        .map(pick);
    }

    // بدون إعادة ترتيب: خذ الأوائل حسب مسافة المتجه
    return rawResults.slice(0, topK).map((_, index) => pick(index));
  }

  public async upsertFaqs(points: any[]) {
    await this.ensureFaqCollection(); // تأكد من وجود الجمعية
    return this.qdrant.upsert(this.faqCollection, { wait: true, points });
  }
  public generateFaqId(faqId: string) {
    return uuidv5(faqId, FAQ_NAMESPACE);
  }

  public generateWebKnowledgeId(merchantId: string, url: string): string {
    if (!merchantId || !url) {
      throw new Error('merchantId or URL is missing');
    }

    // اختياري: تحقق أن merchantId UUID صالح
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        merchantId,
      );
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(merchantId);
    if (!isUUID && !isMongoId) {
      throw new Error('merchantId must be UUID or Mongo ObjectId');
    }

    return uuidv5(`${merchantId}-${url}`, NAMESPACE);
  }
  public async unifiedSemanticSearch(
    text: string,
    merchantId: string,
    topK = 5,
  ): Promise<SearchResult[]> {
    const vector = await this.embed(text);
    const allResults: SearchResult[] = [];
    const searchTargets: { name: string; type: 'faq' | 'document' | 'web' }[] =
      [
        { name: this.faqCollection, type: 'faq' },
        { name: this.documentCollection, type: 'document' },
        { name: this.webCollection, type: 'web' },
      ];

    // اجلب topK*2 من كل مصدر
    await Promise.all(
      searchTargets.map(async (target) => {
        try {
          const results = await this.qdrant.search(target.name, {
            vector,
            limit: topK * 2,
            with_payload: true,
            filter: {
              must: [{ key: 'merchantId', match: { value: merchantId } }],
            },
          });
          for (const item of results) {
            allResults.push({
              type: target.type,
              score: item.score,
              data: (item.payload ?? {}) as FAQData | DocumentData | WebData,
              id: item.id,
            });
          }
        } catch (err) {
          this.logger.warn(
            `[unifiedSemanticSearch] Search failed for ${target.name}: ${err.message}`,
          );
        }
      }),
    );

    if (allResults.length === 0) return [];

    // حضّر المرشحين
    const candidates = allResults.map((r) => {
      if (r.type === 'faq')
        return `${r.data.question ?? ''} - ${r.data.answer ?? ''}`;
      if (r.type === 'web' || r.type === 'document')
        return `${r.data.text ?? ''}`;
      return '';
    });

    // أرسل النتائج إلى Gemini Rerank فقط
    const geminiResult = await geminiRerankTopN({
      query: text,
      candidates,
      topN: topK,
    });

    if (geminiResult.length > 0) {
      return geminiResult.slice(0, topK).map((idx) => allResults[idx]);
    }
    return [];
  }
  public async searchBotFaqs(
    text: string,
    topK = 5,
  ): Promise<BotFaqSearchItem[]> {
    const vector = await this.embed(text);

    const results = await this.qdrant.search(this.botFaqCollection, {
      vector,
      limit: topK,
      with_payload: true,
    });

    return results.map((item) => ({
      id: String(item.id),
      question:
        typeof item.payload?.question === 'string' ? item.payload.question : '',
      answer:
        typeof item.payload?.answer === 'string' ? item.payload.answer : '',
      score: Number(item.score ?? 0),
    }));
  }

  private async ensureFaqCollection() {
    const existing = await this.qdrant.getCollections();
    if (!existing.collections.find((c) => c.name === this.faqCollection)) {
      await this.qdrant.createCollection(this.faqCollection, {
        vectors: { size: 384, distance: 'Cosine' }, // ✅ التأكد من 384
      });
    }
  }
  private buildTextForEmbedding(product: EmbeddableProduct): string {
    const parts: string[] = [];

    if (product.name) parts.push(`Name: ${product.name}`);
    if (product.description) parts.push(`Description: ${product.description}`);

    // 👇 fallback لاسم الفئة
    if (product.category || product.categoryName) {
      parts.push(
        `Category: ${this.safeJoin(product.category ?? product.categoryName)}`,
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

    return parts.join('. ');
  }
}
