import { unlink } from 'node:fs/promises';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as Minio from 'minio';
import { FilterQuery, Types } from 'mongoose';
import sharp from 'sharp';

import { LeadsService } from '../leads/leads.service';
import {
  MAX_SLUG_LENGTH,
  SLUG_SUFFIX_LENGTH,
} from '../merchants/constants/merchant.constants';
import { VectorService } from '../vector/vector.service';

import { CreateStorefrontDto } from './dto/create-storefront.dto';
import { UpdateStorefrontDto } from './dto/update-storefront.dto';
import { StorefrontCategoryRepository } from './repositories/category.repository';
import { StorefrontMerchantRepository } from './repositories/merchant.repository';
import { StorefrontOrderRepository } from './repositories/order.repository';
import {
  ProductEntity,
  StorefrontProductRepository,
} from './repositories/product.repository';
import {
  StorefrontEntity,
  StorefrontRepository,
} from './repositories/storefront.repository';
import { Storefront } from './schemas/storefront.schema';
import {
  STOREFRONT_CATEGORY_REPOSITORY,
  STOREFRONT_MERCHANT_REPOSITORY,
  STOREFRONT_ORDER_REPOSITORY,
  STOREFRONT_PRODUCT_REPOSITORY,
  STOREFRONT_REPOSITORY,
} from './tokens';

// ========= Types & helpers =========
type Json = Record<string, unknown>;

interface StorefrontResult {
  merchant: Json;
  products: Json[];
  categories: Json[];
  storefront: Json;
}

interface BannerLike {
  image?: unknown;
}

function isRecord(v: unknown): v is Json {
  return !!v && typeof v === 'object';
}
function isBannerArray(v: unknown): v is BannerLike[] {
  return Array.isArray(v);
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

// ========= Constants (no-magic-numbers) =========
const MAX_BANNERS = 5;
const DEFAULT_MAX_MP = 5;
const WEBP_QUALITY = 80;
const COLOR_MAX = 255;
const HOVER_PERCENT = 8;
const PCT_MIN = -100;
const PCT_MAX = 100;
const YEAR_SECONDS = 31_536_000;
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_CDN = 'https://cdn.kaleem-ai.com';
const DEFAULT_ORDERS_LIMIT = 50;
const MB_PER_PIXEL = 1_000_000;
const HEX_BASE = 16;

@Injectable()
export class StorefrontService {
  constructor(
    @Inject(STOREFRONT_MERCHANT_REPOSITORY)
    private readonly merchants: StorefrontMerchantRepository,
    @Inject(STOREFRONT_PRODUCT_REPOSITORY)
    private readonly products: StorefrontProductRepository,
    @Inject(STOREFRONT_CATEGORY_REPOSITORY)
    private readonly categories: StorefrontCategoryRepository,
    @Inject(STOREFRONT_REPOSITORY)
    private readonly storefronts: StorefrontRepository,
    @Inject(STOREFRONT_ORDER_REPOSITORY)
    private readonly ordersRepo: StorefrontOrderRepository,
    private readonly vectorService: VectorService,
    @Inject('MINIO_CLIENT') private readonly minio: Minio.Client,
    private readonly leads: LeadsService,
  ) {}

  // ========= Helpers =========
  private normalizeHex(hex: string): string {
    const v = hex.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(v)) {
      // #RGB -> #RRGGBB
      return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return v;
  }

  private lighten(hex: string, percent: number): string {
    const clamped = Math.max(PCT_MIN, Math.min(PCT_MAX, percent)) / 100;
    const n = (x: number) => Math.round(x + (COLOR_MAX - x) * clamped);
    const hexBody = hex.replace('#', '');
    const pairs = hexBody.match(/.{2}/g);
    if (!pairs || pairs.length < 3) return hex; // حرس بسيط
    const [r, g, b] = pairs.map((h) => parseInt(h, 16));
    return (
      '#' +
      [n(r), n(g), n(b)]
        .map((v) => v.toString(HEX_BASE).padStart(2, '0'))
        .join('')
    );
  }

  private toCssVars(brandDark: string): string {
    const hover = this.lighten(brandDark, HOVER_PERCENT);
    return `
:root{
  --brand: ${brandDark};
  --on-brand: #FFFFFF;
  --brand-hover: ${hover};
}
.sf-dark, .navbar, footer { background: var(--brand); color: var(--on-brand); }
.btn-primary, .MuiButton-containedPrimary { background: var(--brand); color: #FFFFFF; }
.btn-primary:hover, .MuiButton-containedPrimary:hover { background: var(--brand-hover); }
`.trim();
  }

  private async processToMaxMegapixels(
    inputPath: string,
    maxMP = DEFAULT_MAX_MP,
  ): Promise<{ buffer: Buffer; mime: string; ext: string }> {
    const MAX_PIXELS = Math.floor(maxMP * MB_PER_PIXEL);
    const img = sharp(inputPath, { failOn: 'none' });
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w <= 0 || h <= 0) {
      throw new BadRequestException('لا يمكن قراءة أبعاد الصورة');
    }

    let pipeline = img;
    const total = w * h;
    if (total > MAX_PIXELS) {
      const scale = Math.sqrt(MAX_PIXELS / total);
      const newW = Math.max(1, Math.floor(w * scale));
      const newH = Math.max(1, Math.floor(h * scale));
      pipeline = pipeline.resize(newW, newH, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    return { buffer, mime: 'image/webp', ext: 'webp' };
  }

  private async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.minio.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(
        bucket,
        process.env.MINIO_REGION || DEFAULT_REGION,
      );
    }
  }

  private publicUrlFor(bucket: string, key: string): string {
    const cdnBase = (process.env.ASSETS_CDN_BASE_URL || DEFAULT_CDN).replace(
      /\/+$/,
      '',
    );
    return `${cdnBase}/${bucket}/${key}`;
  }

  private merchantFilter(merchantId: string): FilterQuery<Storefront> {
    const or: FilterQuery<Storefront>[] = [{ merchant: merchantId as unknown }];
    if (Types.ObjectId.isValid(merchantId)) {
      or.push({ merchant: new Types.ObjectId(merchantId) as unknown });
    }
    return { $or: or } as FilterQuery<Storefront>;
  }

  private normalizeSlug(input: string): string {
    let s = (input || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
    s = s.replace(/[^a-z0-9-]/g, '');
    s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (s.length < 3 || s.length > MAX_SLUG_LENGTH) {
      throw new BadRequestException('slug يجب أن يكون بين 3 و 50 حرفًا');
    }
    return s;
  }

  // ========= Service API =========

  async create(dto: CreateStorefrontDto): Promise<Storefront> {
    const created = await this.storefronts.create(
      dto as unknown as Partial<Storefront>,
    );
    return created as unknown as Storefront;
  }

  private async processSlugUpdate(
    dto: UpdateStorefrontDto,
    before: Json,
    id: string,
  ): Promise<{ slugChanged: boolean; patch: Partial<Storefront> }> {
    let slugChanged = false;
    const patch: Partial<Storefront> = { ...dto } as Partial<Storefront>;

    if ('merchant' in patch) {
      delete (patch as Json).merchant;
    }

    if (dto.brandDark) {
      patch.brandDark = this.normalizeHex(dto.brandDark);
    }

    if (dto.slug) {
      const n = this.normalizeSlug(dto.slug);
      const conflict = await this.storefronts.existsSlug(
        n,
        before._id ? String(before.id) : id,
      );
      if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
      if (n !== before.slug) slugChanged = true;
      patch.slug = n as unknown as Storefront['slug'];
    }

    return { slugChanged, patch };
  }

  private processDomainUpdate(
    dto: UpdateStorefrontDto,
    before: Json,
    patch: Partial<Storefront>,
  ): boolean {
    let domainChanged = false;
    const beforeDomain = before.domain;

    if (
      Object.prototype.hasOwnProperty.call(dto, 'domain') &&
      dto.domain !== beforeDomain
    ) {
      domainChanged = true;
      patch.domain = (dto.domain ?? null) as unknown as Storefront['domain'];
    }

    return domainChanged;
  }

  private async updateRelatedProducts(
    updated: Json,
    slugChanged: boolean,
    domainChanged: boolean,
  ): Promise<void> {
    if (!slugChanged && !domainChanged) return;

    const merchantRef = String(updated.merchant);
    await this.products.updateManyByMerchantSet(merchantRef, {
      ...(slugChanged ? { storefrontSlug: updated.slug } : {}),
      ...(domainChanged ? { storefrontDomain: updated.domain ?? null } : {}),
    } as Partial<ProductEntity>);

    const ids = await this.products.listIdsByMerchant(merchantRef);
    for (const pid of ids) {
      await this.products.resaveById(pid);
      await this.vectorService.upsertProducts([]);
    }
  }

  async update(id: string, dto: UpdateStorefrontDto): Promise<Storefront> {
    const before = await this.storefronts.findByIdOrSlugLean(id);
    if (!before) throw new NotFoundException('Storefront not found');

    const beforeJson = before as unknown as Json;
    const { slugChanged, patch } = await this.processSlugUpdate(
      dto,
      beforeJson,
      id,
    );
    const domainChanged = this.processDomainUpdate(dto, beforeJson, patch);

    const updated = await this.storefronts.updateById(
      beforeJson._id ? String(beforeJson.id) : id,
      patch,
    );
    if (!updated) throw new NotFoundException('Storefront not found');

    await this.updateRelatedProducts(
      updated as unknown as Json,
      slugChanged,
      domainChanged,
    );

    return updated as unknown as Storefront;
  }

  async getStorefront(slugOrId: string): Promise<StorefrontResult> {
    const sf = await this.storefronts.findByIdOrSlugLean(slugOrId);
    if (!sf) throw new NotFoundException('Storefront not found');

    // banners -> URLs عامة
    if (isRecord(sf) && isBannerArray(sf.banners)) {
      const bucket = process.env.MINIO_BUCKET || '';
      sf.banners = sf.banners.map((b: unknown) => {
        const img = asString((b as Json)?.image);
        if (img && !img.startsWith('http')) {
          return { ...(b as Json), image: this.publicUrlFor(bucket, img) };
        }
        return b;
      }) as unknown as typeof sf.banners;
    }

    const merchantId = String((sf as unknown as Json).merchant);
    const merchant = await this.merchants.findByIdLean(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const products = await this.products.findActiveAvailableByMerchant(
      String(
        (merchant as unknown as Json)._id ? String(merchant._id) : merchantId,
      ),
    );
    const categories = await this.categories.listByMerchant(
      (merchant as unknown as Json)._id
        ? String((merchant as unknown as Json)._id)
        : merchantId,
    );

    return {
      merchant: merchant as unknown as Json,
      products: products as unknown as Json[],
      categories: categories as unknown as Json[],
      storefront: sf as unknown as Json,
    };
  }

  async deleteByMerchant(merchantId: string): Promise<void> {
    await this.storefronts.deleteByMerchant(merchantId);
  }

  async checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
    if (!slug) throw new BadRequestException('slug مطلوب');
    const n = this.normalizeSlug(slug);
    const exists = await this.storefronts.existsSlug(n);
    return { available: !exists };
  }

  async findByMerchant(merchantId: string): Promise<Json | null> {
    // يُستخدم داخليًا
    const doc = await this.storefronts.findByMerchant(merchantId);
    return doc as unknown as Json | null;
  }

  async findBySlug(slug: string): Promise<Json | null> {
    const doc = await this.storefronts.findByIdOrSlugLean(slug);
    return doc as unknown as Json | null;
  }

  private async createStorefrontForMerchant(
    merchantId: string,
    dto: UpdateStorefrontDto,
  ): Promise<Storefront> {
    const base: Partial<Storefront> = {
      merchant: Types.ObjectId.isValid(merchantId)
        ? (new Types.ObjectId(merchantId) as unknown as Storefront['merchant'])
        : (merchantId as unknown as Storefront['merchant']),
      primaryColor: '#FF8500',
      secondaryColor: '#1976d2',
      buttonStyle: 'rounded',
    } as Partial<Storefront>;

    if (dto.slug) {
      const n = this.normalizeSlug(dto.slug);
      const conflict = await this.storefronts.existsSlug(n);
      if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
      (base as Json).slug = n;
    } else {
      const fallback = Types.ObjectId.isValid(merchantId)
        ? merchantId.toString().slice(-SLUG_SUFFIX_LENGTH)
        : merchantId;
      let n = this.normalizeSlug(`store-${fallback}`);
      let i = 1;

      while (await this.storefronts.existsSlug(n)) {
        n = this.normalizeSlug(`store-${fallback}-${i}`);
        i += 1;
      }
      (base as Json).slug = n;
    }

    return await this.storefronts.create(base as Storefront);
  }

  async updateByMerchant(
    merchantId: string,
    dto: UpdateStorefrontDto,
  ): Promise<Storefront> {
    let sf = await this.storefronts.findByMerchant(merchantId);

    if (!sf) {
      sf = (await this.createStorefrontForMerchant(
        merchantId,
        dto,
      )) as StorefrontEntity;
    }

    const { patch: update } = await this.processSlugUpdate(
      dto,
      sf as unknown as Json,
      String(
        (sf as unknown as Json)._id
          ? String((sf as unknown as Json)._id)
          : merchantId,
      ),
    );

    const updated = await this.storefronts.updateById(
      String((sf as unknown as Json)._id ? String(sf._id) : merchantId),
      update,
    );
    if (!updated) throw new NotFoundException('Storefront not found');

    return updated as unknown as Storefront;
  }

  // ====== رفع صور البنرات (≤5 إجماليًا) ======
  async uploadBannerImagesToMinio(
    merchantId: string,
    files: Express.Multer.File[],
  ): Promise<{
    urls: string[];
    accepted: number;
    remaining: number;
    max: number;
  }> {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'] as const;
    const bucket = process.env.MINIO_BUCKET || '';
    await this.ensureBucket(bucket);

    const sf = await this.findByMerchant(merchantId);
    const currentCount =
      isRecord(sf) && Array.isArray(sf.banners)
        ? (sf.banners as unknown[]).length
        : 0;

    if (currentCount >= MAX_BANNERS) {
      await Promise.all(
        files.map((f) => unlink(f.path).catch(() => undefined)),
      );
      throw new BadRequestException(
        `لا يمكن إضافة المزيد من البنرات: الحد الأقصى ${MAX_BANNERS}.`,
      );
    }

    const availableSlots = Math.max(0, MAX_BANNERS - currentCount);
    const toProcess = files.slice(0, availableSlots);

    const urls: string[] = [];
    let i = 0;

    for (const file of toProcess) {
      if (!allowed.includes(file.mimetype as (typeof allowed)[number])) {
        await unlink(file.path).catch(() => undefined);
        throw new BadRequestException('صيغة الصورة غير مدعومة (PNG/JPG/WEBP).');
      }

      try {
        const out = await this.processToMaxMegapixels(
          file.path,
          DEFAULT_MAX_MP,
        );
        const key = `merchants/${merchantId}/storefront/banners/banner-${Date.now()}-${i}.${out.ext}`;
        i += 1;

        await this.minio.putObject(bucket, key, out.buffer, out.buffer.length, {
          'Content-Type': out.mime,
          'Cache-Control': `public, max-age=${YEAR_SECONDS}, immutable`,
        });

        const url = this.publicUrlFor(bucket, key);
        urls.push(url);
      } finally {
        await unlink(file.path).catch(() => undefined);
      }
    }

    return {
      urls,
      accepted: toProcess.length,
      remaining: Math.max(0, MAX_BANNERS - (currentCount + toProcess.length)),
      max: MAX_BANNERS,
    };
  }

  async getMyOrdersForSession(
    merchantId: string,
    sessionId: string,
    phone?: string,
    limit = DEFAULT_ORDERS_LIMIT,
  ): Promise<{ orders: unknown[] }> {
    let resolvedPhone = phone;
    if (!resolvedPhone) {
      try {
        resolvedPhone = await this.leads.getPhoneBySession(
          merchantId,
          sessionId,
        );
      } catch {
        // ignore
      }
    }
    const orders = await this.ordersRepo.findMyOrders(merchantId, {
      sessionId,
      phone: resolvedPhone,
      limit,
    });
    return { orders: orders as unknown as unknown[] };
  }

  async getBrandCssBySlug(slug: string): Promise<string> {
    const sf = await this.storefronts.findByIdOrSlugLean(slug);
    if (!sf) throw new NotFoundException('Storefront not found');
    const brand =
      isRecord(sf) && typeof sf.brandDark === 'string'
        ? sf.brandDark
        : '#111827';
    return this.toCssVars(brand);
  }
}
