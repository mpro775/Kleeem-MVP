import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilterQuery, Types } from 'mongoose';
import { UpdateStorefrontDto } from './dto/update-storefront.dto';
import { Storefront } from './schemas/storefront.schema';
import { CreateStorefrontDto } from './dto/create-storefront.dto';
import { VectorService } from '../vector/vector.service';
import * as Minio from 'minio';
import { unlink } from 'node:fs/promises';
import sharp from 'sharp';
import { LeadsService } from '../leads/leads.service';
import {
  STOREFRONT_CATEGORY_REPOSITORY,
  STOREFRONT_MERCHANT_REPOSITORY,
  STOREFRONT_ORDER_REPOSITORY,
  STOREFRONT_PRODUCT_REPOSITORY,
  STOREFRONT_REPOSITORY,
} from './tokens';
import { StorefrontRepository } from './repositories/storefront.repository';
import { StorefrontProductRepository } from './repositories/product.repository';
import { StorefrontMerchantRepository } from './repositories/merchant.repository';
import { StorefrontCategoryRepository } from './repositories/category.repository';
import { StorefrontOrderRepository } from './repositories/order.repository';

export interface StorefrontResult {
  merchant: any;
  products: any[];
  categories: any[];
  storefront: any;
}

@Injectable()
export class StorefrontService {
  private readonly MAX_BANNERS = 5;

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
  private normalizeHex(hex: string) {
    const v = hex.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(v)) {
      return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return v;
  }

  private lighten(hex: string, percent: number) {
    const p = Math.max(-100, Math.min(100, percent)) / 100;
    const n = (x: number) => Math.round(x + (255 - x) * p);
    const [r, g, b] = hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((h) => parseInt(h, 16));
    return (
      '#' +
      [n(r), n(g), n(b)].map((v) => v.toString(16).padStart(2, '0')).join('')
    );
  }

  private toCssVars(brandDark: string) {
    const hover = this.lighten(brandDark, 8);
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
    maxMP = 5,
  ): Promise<{ buffer: Buffer; mime: string; ext: string }> {
    const MAX_PIXELS = Math.floor(maxMP * 1_000_000);
    const img = sharp(inputPath, { failOn: 'none' });
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w <= 0 || h <= 0)
      throw new BadRequestException('لا يمكن قراءة أبعاد الصورة');

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

    const buffer = await pipeline.webp({ quality: 80 }).toBuffer();
    return { buffer, mime: 'image/webp', ext: 'webp' };
  }

  private async ensureBucket(bucket: string) {
    const exists = await this.minio.bucketExists(bucket).catch(() => false);
    if (!exists)
      await this.minio.makeBucket(
        bucket,
        process.env.MINIO_REGION || 'us-east-1',
      );
  }

  private publicUrlFor(bucket: string, key: string): string {
    const cdnBase = (
      process.env.ASSETS_CDN_BASE_URL || 'https://cdn.kaleem-ai.com'
    ).replace(/\/+$/, '');
    return `${cdnBase}/${bucket}/${key}`;
  }

  // ========= Service API =========

  async create(dto: CreateStorefrontDto): Promise<Storefront> {
    const created = await this.storefronts.create(dto as any);
    return created as unknown as Storefront;
  }

  async update(id: string, dto: UpdateStorefrontDto): Promise<Storefront> {
    const before = await this.storefronts.findByIdOrSlugLean(id);
    if (!before) throw new NotFoundException('Storefront not found');

    // prepare patch
    const patch: Partial<Storefront> = { ...(dto as any) };
    delete (patch as any).merchant;

    if (dto.brandDark) patch.brandDark = this.normalizeHex(dto.brandDark);

    let slugChanged = false;
    let domainChanged = false;

    if (dto.slug) {
      const n = this.normalizeSlug(dto.slug);
      const conflict = await this.storefronts.existsSlug(n, String(before._id));
      if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
      if (n !== before.slug) slugChanged = true;
      patch.slug = n as any;
    }

    if (dto.domain !== undefined && dto.domain !== (before as any).domain) {
      domainChanged = true;
    }

    const updated = await this.storefronts.updateById(
      String(before._id),
      patch,
    );
    if (!updated) throw new NotFoundException('Storefront not found');

    if (slugChanged || domainChanged) {
      await this.products.updateManyByMerchantSet(String(updated.merchant), {
        ...(slugChanged ? { storefrontSlug: updated.slug as any } : {}),
        ...(domainChanged
          ? { storefrontDomain: (updated as any).domain ?? null }
          : {}),
      });

      const ids = await this.products.listIdsByMerchant(
        String(updated.merchant),
      );
      for (const id of ids) {
        await this.products.resaveById(id); // trigger hooks
        await this.vectorService.upsertProducts([
          /* ... */
        ]);
      }
    }

    return updated as unknown as Storefront;
  }

  async getStorefront(slugOrId: string): Promise<StorefrontResult> {
    const sf = await this.storefronts.findByIdOrSlugLean(slugOrId);
    if (!sf) throw new NotFoundException('Storefront not found');

    if (Array.isArray(sf.banners)) {
      const bucket = process.env.MINIO_BUCKET!;
      sf.banners = sf.banners.map((b) => {
        if (b.image && !String(b.image).startsWith('http')) {
          b.image = this.publicUrlFor(bucket, String(b.image));
        }
        return b;
      });
    }

    const merchant = await this.merchants.findByIdLean(String(sf.merchant));
    if (!merchant) throw new NotFoundException('Merchant not found');

    const products = await this.products.findActiveAvailableByMerchant(
      String(merchant._id),
    );
    const categories = await this.categories.listByMerchant(
      String(merchant._id),
    );

    return { merchant, products, categories, storefront: sf };
  }

  async deleteByMerchant(merchantId: string) {
    await this.storefronts.deleteByMerchant(merchantId);
  }

  private merchantFilter(merchantId: string): FilterQuery<Storefront> {
    const or: any[] = [{ merchant: merchantId }];
    if (Types.ObjectId.isValid(merchantId))
      or.push({ merchant: new Types.ObjectId(merchantId) });
    return { $or: or };
  }

  private normalizeSlug(input: string): string {
    let s = (input || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
    s = s.replace(/[^a-z0-9-]/g, '');
    s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (s.length < 3 || s.length > 50) {
      throw new BadRequestException('slug يجب أن يكون بين 3 و 50 حرفًا');
    }
    return s;
  }

  async checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
    if (!slug) throw new BadRequestException('slug مطلوب');
    const n = this.normalizeSlug(slug);
    const exists = await this.storefronts.existsSlug(n);
    return { available: !exists };
  }

  async findByMerchant(merchantId: string) {
    // يُستخدم داخليًا
    return this.storefronts.findByMerchant(merchantId) as any;
  }

  async findBySlug(slug: string) {
    return this.storefronts.findByIdOrSlugLean(slug) as any;
  }

  async updateByMerchant(merchantId: string, dto: UpdateStorefrontDto) {
    let sf = await this.storefronts.findByMerchant(merchantId);

    if (!sf) {
      const base: Partial<Storefront> = {
        merchant: Types.ObjectId.isValid(merchantId)
          ? new Types.ObjectId(merchantId)
          : (merchantId as any),
        primaryColor: '#FF8500',
        secondaryColor: '#1976d2',
        buttonStyle: 'rounded',
        slug: undefined!,
      };
      if (dto.slug) {
        const n = this.normalizeSlug(dto.slug);
        const conflict = await this.storefronts.existsSlug(n);
        if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
        base.slug = n as any;
      } else {
        const fallback = Types.ObjectId.isValid(merchantId)
          ? merchantId.toString().slice(-8)
          : merchantId;
        let n = this.normalizeSlug(`store-${fallback}`);
        let i = 1;
        while (await this.storefronts.existsSlug(n)) {
          n = this.normalizeSlug(`store-${fallback}-${i++}`);
        }
        base.slug = n as any;
      }
      sf = await this.storefronts.create(base);
    }

    const update: Partial<Storefront> = { ...(dto as any) };
    delete (update as any).merchant;

    if (dto.brandDark) update.brandDark = this.normalizeHex(dto.brandDark);

    if (dto.slug) {
      const n = this.normalizeSlug(dto.slug);
      const conflict = await this.storefronts.existsSlug(n, String(sf._id));
      if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
      update.slug = n as any;
    }

    const updated = await this.storefronts.updateById(String(sf._id), update);
    if (!updated) throw new NotFoundException('Storefront not found');

    return updated as any;
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
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    const bucket = process.env.MINIO_BUCKET!;
    await this.ensureBucket(bucket);

    const sf = await this.findByMerchant(merchantId);
    const currentCount = sf?.banners?.length ?? 0;

    if (currentCount >= this.MAX_BANNERS) {
      await Promise.all(files.map((f) => unlink(f.path).catch(() => {})));
      throw new BadRequestException(
        `لا يمكن إضافة المزيد من البنرات: الحد الأقصى ${this.MAX_BANNERS}.`,
      );
    }

    const availableSlots = Math.max(0, this.MAX_BANNERS - currentCount);
    const toProcess = files.slice(0, availableSlots);

    const urls: string[] = [];
    let i = 0;

    for (const file of toProcess) {
      if (!allowed.includes(file.mimetype)) {
        await unlink(file.path).catch(() => {});
        throw new BadRequestException('صيغة الصورة غير مدعومة (PNG/JPG/WEBP).');
      }

      try {
        const out = await this.processToMaxMegapixels(file.path, 5);
        const key = `merchants/${merchantId}/storefront/banners/banner-${Date.now()}-${i++}.${out.ext}`;

        await this.minio.putObject(bucket, key, out.buffer, out.buffer.length, {
          'Content-Type': out.mime,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });

        const url = this.publicUrlFor(bucket, key);
        urls.push(url);
      } finally {
        await unlink(file.path).catch(() => {});
      }
    }

    return {
      urls,
      accepted: toProcess.length,
      remaining: Math.max(
        0,
        this.MAX_BANNERS - (currentCount + toProcess.length),
      ),
      max: this.MAX_BANNERS,
    };
  }

  async getMyOrdersForSession(
    merchantId: string,
    sessionId: string,
    phone?: string,
    limit = 50,
  ) {
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
    return { orders };
  }

  async getBrandCssBySlug(slug: string) {
    const sf = await this.storefronts.findByIdOrSlugLean(slug);
    if (!sf) throw new NotFoundException('Storefront not found');
    const brand = (sf as any).brandDark || '#111827';
    return this.toCssVars(brand);
  }
}
