// src/storefront/storefront.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { UpdateStorefrontDto } from './dto/update-storefront.dto';
import { Storefront, StorefrontDocument } from './schemas/storefront.schema';
import { CreateStorefrontDto } from './dto/create-storefront.dto';
import { FilterQuery } from 'mongoose';
import { VectorService } from '../vector/vector.service';
import * as Minio from 'minio';
import { unlink } from 'node:fs/promises';
import sharp from 'sharp';
import { LeadsService } from '../leads/leads.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

export interface StorefrontResult {
  merchant: any;
  products: any[];
  categories: any[];
  storefront: any;
}
@Injectable()
export class StorefrontService {
  private readonly MAX_BANNERS = 5;
  private normalizeHex(hex: string) {
    const v = hex.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(v)) {
      // حوّل #ABC إلى #AABBCC
      return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return v;
  }
  // ====== تحجيم مع الحفاظ على النسبة إلى ≤ 5 ميجا بكسل ======
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

    // إن كانت أكبر من 5MP نقلّص بالأبعاد الفعلية مع الحفاظ على النسبة
    if (total > MAX_PIXELS) {
      const scale = Math.sqrt(MAX_PIXELS / total); // نسبة التصغير
      const newW = Math.max(1, Math.floor(w * scale));
      const newH = Math.max(1, Math.floor(h * scale));
      pipeline = pipeline.resize(newW, newH, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // نُخرج WEBP بجودة مناسبة (يدعم الشفافية والنِسَب العريضة للبانرات)
    const buffer = await pipeline.webp({ quality: 80 }).toBuffer();
    return { buffer, mime: 'image/webp', ext: 'webp' };
  }

  private toCssVars(brandDark: string) {
    // تفتيح بسيط للهوفر (8%)
    const hover = this.lighten(brandDark, 8);
    return `
  :root{
    --brand: ${brandDark};
    --on-brand: #FFFFFF;
    --brand-hover: ${hover};
  }
  /* أسطح داكنة موحّدة */
  .sf-dark, .navbar, footer {
    background: var(--brand);
    color: var(--on-brand);
  }
  /* أزرار أساسية */
  .btn-primary, .MuiButton-containedPrimary {
    background: var(--brand);
    color: #FFFFFF;
  }
  .btn-primary:hover, .MuiButton-containedPrimary:hover {
    background: var(--brand-hover);
  }
  `.trim();
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

    // احضر storefront لحساب المتبقي
    const sf = await this.findByMerchant(merchantId);
    const currentCount = sf?.banners?.length ?? 0;

    if (currentCount >= this.MAX_BANNERS) {
      // لا يوجد أي خانة متاحة
      // تنظيف الملفات المؤقتة
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
        const out = await this.processToMaxMegapixels(file.path, 5); // { buffer, mime:'image/webp', ext:'webp' }
        const key = `merchants/${merchantId}/storefront/banners/banner-${Date.now()}-${i++}.${out.ext}`;

        // نرفع البافر مباشرة (لا نحتاج fPutObject على المسار)
        await this.minio.putObject(bucket, key, out.buffer, out.buffer.length, {
          'Content-Type': out.mime, // image/webp
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

  // ====== Helpers للتخزين (موجودة لديك – نعيدها للوضوح) ======
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

  constructor(
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Storefront.name)
    private storefrontModel: Model<StorefrontDocument>,
    private vectorService: VectorService,
    @Inject('MINIO_CLIENT') private readonly minio: Minio.Client,
    private readonly leads: LeadsService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}
  async create(dto: CreateStorefrontDto): Promise<Storefront> {
    return this.storefrontModel.create(dto);
  }

  async update(id: string, dto: UpdateStorefrontDto): Promise<Storefront> {
    const before = await this.storefrontModel.findById(id);
    if (!before) throw new NotFoundException('Storefront not found');

    const updated = await this.storefrontModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Storefront not found');

    const slugChanged = dto.slug && dto.slug !== before.slug;
    const domainChanged =
      dto.domain !== undefined && dto.domain !== before.domain;

    if (slugChanged || domainChanged) {
      await this.productModel.updateMany({ merchantId: updated.merchant }, {
        ...(slugChanged ? { storefrontSlug: updated.slug } : {}),
        ...(domainChanged ? { storefrontDomain: updated.domain ?? null } : {}),
      } as any);

      const ids = await this.productModel
        .find({ merchantId: updated.merchant })
        .select('_id')
        .lean();
      for (const { _id } of ids) {
        const p = await this.productModel.findById(_id);
        if (!p) continue;
        await p.save();
        await this.vectorService.upsertProducts([
          /* ... */
        ]);
      }
    }

    // ✅ مضمونة ترجع دائمًا
    return updated;
  }

  async getStorefront(slugOrId: string): Promise<StorefrontResult> {
    const sf = await this.storefrontModel
      .findOne(
        Types.ObjectId.isValid(slugOrId)
          ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
          : { slug: slugOrId },
      )
      .lean();

    if (!sf) throw new NotFoundException('Storefront not found');

    // ✅ طبّق publicUrlFor على كل banner.image
    if (Array.isArray(sf.banners)) {
      const bucket = process.env.MINIO_BUCKET!;
      sf.banners = sf.banners.map((b) => {
        if (b.image && !b.image.startsWith('http')) {
          b.image = this.publicUrlFor(bucket, b.image);
        }
        return b;
      });
    }

    const merchant = await this.merchantModel.findById(sf.merchant).lean();
    if (!merchant) throw new NotFoundException('Merchant not found');

    const products = await this.productModel
      .find({ merchantId: merchant._id, status: 'active', isAvailable: true })
      .sort({ createdAt: -1 })
      .lean();

    const categories = await this.categoryModel
      .find({ merchantId: merchant._id })
      .sort({ name: 1 })
      .lean();

    return { merchant, products, categories, storefront: sf };
  }

  async deleteByMerchant(merchantId: string) {
    await this.storefrontModel.deleteOne({ merchant: merchantId }).exec();
  }
  private merchantFilter(merchantId: string): FilterQuery<Storefront> {
    // نبحث بالـ string وبـ ObjectId لو صالح
    const or: any[] = [{ merchant: merchantId }];
    if (Types.ObjectId.isValid(merchantId)) {
      or.push({ merchant: new Types.ObjectId(merchantId) });
    }
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
    const exists = await this.storefrontModel.exists({ slug: n }).lean();
    return { available: !exists };
  }

  async findByMerchant(merchantId: string): Promise<StorefrontDocument | null> {
    return this.storefrontModel.findOne(this.merchantFilter(merchantId)).exec();
  }
  async updateByMerchant(merchantId: string, dto: UpdateStorefrontDto) {
    let sf = await this.storefrontModel.findOne(
      this.merchantFilter(merchantId),
    );

    if (!sf) {
      // إنشاء افتراضي إن لم توجد (علشان ما ترجع 404 للتجّار القدامى)
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
        const conflict = await this.storefrontModel.exists({ slug: n }).lean();
        if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
        base.slug = n;
      } else {
        // توليد slug افتراضي (merchantId أو merchant.name عند الحاجة)
        const fallback = Types.ObjectId.isValid(merchantId)
          ? merchantId.toString().slice(-8)
          : merchantId;
        let n = this.normalizeSlug(`store-${fallback}`);
        // حلّ تعارض تلقائيًا
        let i = 1;
        while (await this.storefrontModel.exists({ slug: n }).lean()) {
          n = this.normalizeSlug(`store-${fallback}-${i++}`);
        }
        base.slug = n;
      }
      sf = await this.storefrontModel.create(
        base as unknown as CreateStorefrontDto,
      );
    }

    // لا نسمح بتعديل merchant من البودي
    const update: Partial<Storefront> = { ...(dto as any) };
    delete (update as any).merchant;

    if (dto.brandDark) {
      update.brandDark = this.normalizeHex(dto.brandDark);
    }

    if (dto.slug) {
      const n = this.normalizeSlug(dto.slug);
      const conflict = await this.storefrontModel.exists({
        slug: n,
        _id: { $ne: sf._id },
      });
      if (conflict) throw new BadRequestException('هذا الـ slug محجوز');
      update.slug = n;
    }

    Object.assign(sf, update);
    await sf.save();
    return sf;
  }
  async getMyOrdersForSession(
    merchantId: string,
    sessionId: string,
    phone?: string,
    limit = 50,
  ) {
    // لو ما أُرسل الهاتف من الفرونت، نحاول نستخرجه من leads
    let resolvedPhone = phone;
    if (!resolvedPhone) {
      try {
        resolvedPhone = await this.leads.getPhoneBySession(
          merchantId,
          sessionId,
        );
      } catch {
        // تجاهل الخطأ واكمل بدون هاتف
      }
    }

    const filter: any = { merchantId, $or: [] as any[] };

    if (sessionId) filter.$or.push({ sessionId });
    if (resolvedPhone) filter.$or.push({ 'customer.phone': resolvedPhone });

    // لو ما توفرت أي حالة، نتجنب $or فارغ
    if (filter.$or.length === 0) {
      return { orders: [] };
    }

    const orders = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();

    return { orders };
  }
  async getBrandCssBySlug(slug: string) {
    const sf = await this.storefrontModel.findOne({ slug }).lean();
    if (!sf) throw new NotFoundException('Storefront not found');
    const brand = (sf as any).brandDark || '#111827';
    return this.toCssVars(brand);
  }
}
