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
const PRODUCT_NAMESPACE = 'd94a5f5a-2bfc-4c2d-9f10-1234567890ab';
const FAQ_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

@Injectable()
export class VectorService implements OnModuleInit {
  private qdrant: QdrantClient;
  private readonly collection = 'products';
  private readonly offerCollection = 'offers';
  public readonly faqCollection = 'faqs';
  private readonly documentCollection = 'documents';
  private readonly botFaqCollection = 'bot_faqs'; // 👈 كولكشن منفصل لقاعدة معرفة كليم

  private readonly webCollection = 'web_knowledge'; // 👈 مجموعات جديدة
  private readonly logger = new Logger(VectorService.name);

  constructor(
    private readonly http: HttpService,
    @Inject(forwardRef(() => ProductsService)) // ← أضف هذه السطر
    private readonly productsService: ProductsService,
    // 👈 وأيضًا هذا لو استخدمته
  ) {}
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

  // vector.service.ts
  public async embed(text: string): Promise<number[]> {
    const embeddingUrl = 'http://31.97.155.167:8000'; // تأكد من إزالة المسافة الأولى قبل http
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
      products.map(async (p) => ({
        id: uuidv5(p.id, PRODUCT_NAMESPACE), // ← UUID ثابت لكل منتج
        vector: await this.embed(this.buildTextForEmbedding(p)), // ← تحويل المنتج إلى متجه
        payload: {
          mongoId: p.id,
          merchantId: p.merchantId,
          name: p.name,
          description: p.description,
          category: p.category,
          specsBlock: p.specsBlock ?? [],
          keywords: p.keywords ?? [],
        },
      })),
    );

    return this.qdrant.upsert(this.collection, { wait: true, points });
  }

  public async querySimilarProducts(
    text: string,
    merchantId: string,
    topK = 5,
  ): Promise<
    {
      id: string;
      name?: string;
      price?: number;
      url?: string;
      score: number;
    }[]
  > {
    // 1. استخرج embedding للسؤال
    const vector = await this.embed(text);

    // 2. استخرج المنتجات من Qdrant
    const rawResults = await this.qdrant.search(this.collection, {
      vector,
      limit: topK * 4, // عدد أكبر لأن Gemini سيعيد ترتيبهم!
      with_payload: {
        include: ['mongoId', 'name', 'price', 'url'],
      },
      filter: {
        must: [{ key: 'merchantId', match: { value: merchantId } }],
      },
    });

    if (!rawResults.length) return [];

    // 3. حضّر المرشحين للنموذج
    const candidates = rawResults.map((item) => {
      const p = item.payload as any;
      // يمكنك إضافة تفاصيل إضافية (سعر/وصف) لو أردت زيادة دقة Gemini
      return `اسم المنتج: ${p.name ?? ''}${p.price ? ` - السعر: ${p.price}` : ''}`;
    });

    // 4. استعمل Gemini لترتيب النتائج
    const geminiResult = await geminiRerankTopN({
      query: text,
      candidates,
      topN: topK,
    });

    // 5. أرجع أفضل نتيجة واحدة أو عدة (يمكن تعديل البرومبت لإرجاع Top N)
    if (geminiResult.length > 0) {
      const bestItem = rawResults[geminiResult[0]];
      const payload = bestItem.payload as any;
      return [
        {
          id: payload.mongoId as string,
          name: payload.name,
          price: payload.price,
          url: payload.url,
          score: 1, // يمكنك إضافة سكّور ثابت أو تركه 1 للتمييز فقط
        },
      ];
    }

    // إذا لم يجد Gemini جوابًا مناسبًا
    return [];
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
    if (product.category) parts.push(`Category: ${product.category}`);
    if (product.specsBlock?.length)
      parts.push(`Specs: ${product.specsBlock.join(', ')}`);
    if (product.keywords?.length)
      parts.push(`Keywords: ${product.keywords.join(', ')}`);
    return parts.join('. ');
  }
}
