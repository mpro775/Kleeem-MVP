// src/modules/products/services/product-sync.service.ts
import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { CategoriesService } from '../../categories/categories.service';
import { StorefrontService } from '../../storefront/storefront.service';

import { ProductIndexService } from './product-index.service';

import type { ExternalProduct } from '../../integrations/types';
import type { Storefront } from '../../storefront/schemas/storefront.schema';
import type { ProductsRepository } from '../repositories/products.repository';
import type { Product, ProductDocument } from '../schemas/product.schema';

/* ===================== ثوابت لتجنّب الأرقام السحرية ===================== */
const MAX_SYNC_IMAGES = 6;
const STATUS_ACTIVE = 'active';
const SYNC_OK = 'ok';

/* =============================== حُرّاس/مساعدات =============================== */
function ensureObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid merchantId');
  }
  return new Types.ObjectId(id);
}

function toNumber(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBooleanFromStock(stock: unknown): boolean {
  return toNumber(stock, 0) > 0;
}

type RawImage = { url?: unknown };
type RawPayload =
  | {
      description?: unknown;
      images?: unknown;
      permalink?: unknown;
    }
  | null
  | undefined;

function extractDescription(raw: unknown): string {
  const r = raw as RawPayload;
  const s = r && typeof r.description === 'string' ? r.description : '';
  return s;
}

function extractPermalink(raw: unknown): string | null {
  const r = raw as RawPayload;
  const p = r && typeof r.permalink === 'string' ? r.permalink : null;
  return p;
}

function extractImages(raw: unknown, max = MAX_SYNC_IMAGES): string[] {
  const r = raw as RawPayload;
  const maybeImgs = r?.images;
  if (!Array.isArray(maybeImgs)) return [];
  const urls: string[] = [];
  for (const item of maybeImgs.slice(0, max)) {
    const img = item as RawImage;
    if (typeof img?.url === 'string' && img.url.trim().length > 0) {
      urls.push(img.url);
    }
  }
  return urls;
}

function oidToString(oid: Types.ObjectId): string {
  return typeof oid.toHexString === 'function'
    ? oid.toHexString()
    : String(oid);
}

async function upsertAndIndex(
  repo: ProductsRepository,
  indexer: ProductIndexService,
  storefronts: StorefrontService,
  categories: CategoriesService,
  merchantId: Types.ObjectId,
  provider: 'zid' | 'salla',
  docData: Partial<Product> & { externalId: string },
  logger: Logger,
): Promise<ProductDocument> {
  const doc = await repo.upsertExternal(merchantId, provider, docData);

  try {
    const sf = (await storefronts.findByMerchant(
      oidToString(doc.merchantId),
    )) as Storefront | null;
    const catName =
      doc.category &&
      (await categories.findOne(
        oidToString(doc.category),
        oidToString(doc.merchantId),
      ));
    await indexer.upsert(doc, sf ?? undefined, catName?.name ?? null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(`vector upsert (external) failed: ${msg}`);
  }

  return doc;
}

/* ====================================================================== */
@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);

  constructor(
    @Inject('ProductsRepository') private readonly repo: ProductsRepository,
    private readonly indexer: ProductIndexService,
    @Inject(forwardRef(() => StorefrontService))
    private readonly storefronts: StorefrontService,
    private readonly categories: CategoriesService,
  ) {}

  /**
   * إدراج/تحديث منتج خارجي (Zid/Salla) ثم فهرسته.
   * يقلّ التعقيد بتجزئة المنطق إلى مساعدات صغيرة واضحة.
   */
  async upsertExternalProduct(
    merchantId: string,
    provider: 'zid' | 'salla',
    p: ExternalProduct,
  ): Promise<{ created: boolean; id: string }> {
    const mId = ensureObjectId(merchantId);

    // هل موجود مسبقًا؟
    const existed = await this.repo.findByExternal(mId, p.externalId);

    // بناء بيانات الوثيقة بدقّة وبدون any
    const price = toNumber(p.price, 0);
    const isAvailable = toBooleanFromStock(p.stock);
    const images = extractImages(p.raw);
    const permalink = extractPermalink(p.raw);
    const description = extractDescription(p.raw);

    const docData: Partial<Product> & { externalId: string } = {
      merchantId: mId,
      source: 'api', // يطابق union في Product
      externalId: p.externalId,
      platform: provider,

      name: typeof p.title === 'string' ? p.title : '',
      description,
      price,
      isAvailable,
      images,

      category: undefined, // تعيين لاحقًا إن لزم
      sourceUrl: permalink,
      originalUrl: permalink,

      keywords: [],
      status: STATUS_ACTIVE,
      syncStatus: SYNC_OK,
    };

    const doc = await upsertAndIndex(
      this.repo,
      this.indexer,
      this.storefronts,
      this.categories,
      mId,
      provider,
      docData,
      this.logger,
    );

    return { created: !existed, id: oidToString(doc._id) };
  }
}
