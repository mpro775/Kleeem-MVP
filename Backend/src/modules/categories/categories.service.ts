// categories.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CategoryNotFoundError } from '../../common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import * as Minio from 'minio';
import { promises as fs } from 'fs';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import slugify from 'slugify';
import sharp from 'sharp';
import { Product, ProductDocument } from '../products/schemas/product.schema';

const unlink = fs.unlink;

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @Inject('MINIO_CLIENT') private readonly minio: Minio.Client,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  private async computePathAncestors(
    merchantId: Types.ObjectId,
    parentId?: string | null,
    slug?: string,
  ) {
    let ancestors: Types.ObjectId[] = [];
    let depth = 0;
    let basePath = '';
    if (parentId) {
      const parent = await this.categoryModel
        .findOne({
          _id: parentId,
          merchantId,
        })
        .lean();
      if (!parent) {
        throw new BadRequestException('Parent not found for this merchant');
      }
      ancestors = [...(parent.ancestors || []), parent._id];
      depth = ancestors.length;
      basePath = parent.path ?? '';
    }
    const path = basePath ? `${basePath}/${slug}` : slug;
    return { ancestors, depth, path };
  }
  private getPublicFileUrl(bucket: string, key: string) {
    // الأفضل تعرّف دومين عام من البيئة لتجنّب Mixed Content
    const base =
      process.env.MINIO_PUBLIC_BASEURL || // مثل: https://files.kaleem-ai.com
      process.env.MINIO_ENDPOINT || // كملاذ أخير
      '';
    if (!base) return `/${bucket}/${key}`;

    // لو endpoint يبدأ بـ http فحوّله https (تجنّب الحجب في الموقع https)
    const httpsBase = base.replace(/^http:\/\//i, 'https://');
    return `${httpsBase.replace(/\/+$/, '')}/${bucket}/${key}`;
  }
  async create(dto: CreateCategoryDto) {
    const merchantId = new Types.ObjectId(dto.merchantId);
    const slug =
      dto.slug ??
      slugify(dto.name, { lower: true, strict: true, locale: 'ar' });
    const { ancestors, depth, path } = await this.computePathAncestors(
      merchantId,
      dto.parent ?? null,
      slug,
    );

    const created = await this.categoryModel.create({
      ...dto,
      slug,
      merchantId,
      ancestors,
      depth,
      path,
      order: dto.order ?? 0,
    });
    return created.toObject();
  }

  async findAllFlat(merchantId: string): Promise<any[]> {
    return this.categoryModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ depth: 1, order: 1, name: 1 })
      .lean();
  }

  async findAllTree(merchantId: string) {
    const all = await this.findAllFlat(merchantId);
    const map = new Map<string, any>();
    all.forEach((c) => map.set(c._id.toString(), { ...c, children: [] }));
    const tree: any[] = [];
    all.forEach((c) => {
      if (c.parent) {
        map.get(c.parent.toString())?.children.push(map.get(c._id.toString()));
      } else {
        tree.push(map.get(c._id.toString()));
      }
    });
    // ترتيب الأطفال
    const sortChildren = (node: any) => {
      node.children.sort(
        (a: any, b: any) => a.order - b.order || a.name.localeCompare(b.name),
      );
      node.children.forEach(sortChildren);
    };
    tree.forEach(sortChildren);
    return tree;
  }

  async breadcrumbs(id: string, merchantId: string): Promise<any[]> {
    const mId = new Types.ObjectId(merchantId);
    const doc = await this.categoryModel
      .findOne({ _id: id, merchantId: mId })
      .lean();
    if (!doc) throw new CategoryNotFoundError(id);
    const ids = [...doc.ancestors, doc._id];
    return this.categoryModel
      .find({ _id: { $in: ids } }, { name: 1, slug: 1, path: 1, depth: 1 })
      .sort({ depth: 1 })
      .lean();
  }

  async subtree(id: string, merchantId: string) {
    const mId = new Types.ObjectId(merchantId);
    const root = await this.categoryModel
      .findOne({ _id: id, merchantId: mId })
      .lean();
    if (!root) throw new CategoryNotFoundError(id);

    const all = await this.categoryModel
      .find({ merchantId: mId, $or: [{ _id: id }, { ancestors: root._id }] })
      .lean();

    const map = new Map<string, any>();
    all.forEach((c) => map.set(c._id.toString(), { ...c, children: [] }));
    all.forEach((c) => {
      if (c.parent) {
        map.get(c.parent.toString())?.children.push(map.get(c._id.toString()));
      }
    });
    return map.get(root._id.toString());
  }
  async findOne(id: string, merchantId: string) {
    const mId = new Types.ObjectId(merchantId);
    const cat = await this.categoryModel.findOne({ _id: id, merchantId: mId });
    if (!cat) throw new CategoryNotFoundError(id);
    return cat;
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    const mId = new Types.ObjectId(merchantId);

    // ابحث أولًا لتتأكد أنها تخص التاجر
    const cat = await this.categoryModel.findOne({ _id: id, merchantId: mId });
    if (!cat) throw new CategoryNotFoundError(id);

    // امنع تعديل merchantId من الـ DTO لو وُجد بالخطأ
    if ('merchantId' in dto) delete (dto as any).merchantId;

    // لو تغيّر الأب: تحقّق منه وتجنّب الحلقة
    if (dto.parent !== undefined) {
      const newParent = dto.parent
        ? new Types.ObjectId(dto.parent as any)
        : null;

      if (newParent && newParent.equals(cat._id)) {
        throw new BadRequestException('Cannot set parent to itself');
      }

      if (newParent) {
        // تأكّد أن الأب موجود لنفس التاجر
        const parentDoc = await this.categoryModel
          .findOne({ _id: newParent, merchantId: mId })
          .lean();
        if (!parentDoc)
          throw new BadRequestException('Parent category not found');

        // منع النقل تحت أحد أحفاده
        const loop = await this.categoryModel.exists({
          _id: newParent,
          merchantId: mId,
          ancestors: cat._id,
        });
        if (loop)
          throw new BadRequestException('Cannot move under its own descendant');

        (cat as any).parent = newParent;
      } else {
        (cat as any).parent = null;
      }

      // إن كان عندك نظام ancestors/slug/path/depth، حدّثها هنا أو دع هوك pre-save يتكفّل
      // مثال سريع (اختياري):
      // await this.recomputeHierarchy(cat, mId);
    }

    // حقول بسيطة
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.description !== undefined)
      (cat as any).description = dto.description;
    if (dto.image !== undefined) (cat as any).image = dto.image;
    if (dto.keywords !== undefined) (cat as any).keywords = dto.keywords;

    await cat.save();
    return cat;
  }
  private async calcNewOrder(
    merchantId: string | Types.ObjectId,
    parentId: Types.ObjectId | null,
    opts: {
      afterId?: string | null;
      beforeId?: string | null;
      position?: number | null;
    },
  ) {
    const siblings = await this.categoryModel
      .find({ merchantId: new Types.ObjectId(merchantId), parent: parentId })
      .sort({ order: 1, name: 1 })
      .lean();

    if (siblings.length === 0) return 0;

    if (opts.position != null) {
      const pos = Math.max(0, Math.min(opts.position, siblings.length));
      return pos;
    }
    if (opts.afterId) {
      const idx = siblings.findIndex((s) => s._id.toString() === opts.afterId);
      if (idx === -1) throw new BadRequestException('afterId not in siblings');
      return idx + 1;
    }
    if (opts.beforeId) {
      const idx = siblings.findIndex((s) => s._id.toString() === opts.beforeId);
      if (idx === -1) throw new BadRequestException('beforeId not in siblings');
      return idx;
    }
    return siblings.length; // نهاية الإخوة
  }

  private async normalizeSiblingsOrders(
    merchantId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    session?: ClientSession,
  ) {
    const siblings = await this.categoryModel
      .find({ merchantId, parent: parentId }, null, { session })
      .sort({ order: 1, name: 1 });
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i].order !== i) {
        await this.categoryModel.updateOne(
          { _id: siblings[i]._id },
          { $set: { order: i } },
          { session },
        );
      }
    }
  }

  // --- نقل/ترتيب العقدة ---
  async move(id: string, merchantId: string, dto: MoveCategoryDto) {
    const mId = new Types.ObjectId(merchantId);

    const current = await this.categoryModel.findOne({
      _id: id,
      merchantId: mId,
    });
    if (!current) throw new CategoryNotFoundError(id);

    const newParentId = dto.hasOwnProperty('parent')
      ? dto.parent
        ? new Types.ObjectId(dto.parent)
        : null
      : (current.parent ?? null);

    if (newParentId) {
      const isDescendant = await this.categoryModel.exists({
        _id: newParentId,
        merchantId: mId, // ← هنا
        ancestors: current._id,
      });
      if (isDescendant)
        throw new BadRequestException('Cannot move under its own descendant');
    }

    const session = await this.categoryModel.db.startSession();
    await session.withTransaction(async () => {
      const newOrder = await this.calcNewOrder(mId, newParentId, {
        // ← هنا مرّر mId
        afterId: dto.afterId ?? null,
        beforeId: dto.beforeId ?? null,
        position: dto.position ?? null,
      });

      const parentChanged =
        (newParentId ?? null)?.toString() !==
        (current.parent ?? null)?.toString();
      if (parentChanged) {
        await this.update(id, merchantId, { parent: newParentId as any });
      }

      await this.categoryModel.updateOne(
        { _id: current._id },
        { $set: { order: newOrder } },
        { session },
      );

      await this.normalizeSiblingsOrders(mId, newParentId, session);
      if (parentChanged) {
        await this.normalizeSiblingsOrders(mId, current.parent as any, session);
      }
    });
    session.endSession();

    return this.categoryModel.findById(current._id);
  }

  // --- حذف متشعّب مع منع وجود منتجات ---
  async remove(id: string, merchantId: string, cascade = false) {
    const mId = new Types.ObjectId(merchantId);
    const node = await this.categoryModel
      .findOne({ _id: id, merchantId: mId })
      .lean();
    if (!node) throw new CategoryNotFoundError(id);

    const allIds = await this.categoryModel
      .find(
        { merchantId: mId, $or: [{ _id: node._id }, { ancestors: node._id }] },
        { _id: 1 },
      )
      .lean();
    const ids = allIds.map((d) => d._id);

    const hasProducts = await this.productModel.exists({
      merchantId: mId,
      category: { $in: ids },
    });
    if (hasProducts) {
      throw new BadRequestException('لا يمكن حذف فئة مرتبطة بمنتجات');
    }
    const hasChildren = ids.length > 1;
    if (hasChildren && !cascade) {
      throw new BadRequestException(
        'Category has children. استخدم ?cascade=true لحذف الشجرة.',
      );
    }
    await this.categoryModel.deleteMany({ merchantId: mId, _id: { $in: ids } });
    return {
      message: hasChildren
        ? 'Category subtree deleted successfully'
        : 'Category deleted successfully',
    };
  }
  // --- رفع صورة مربعة ≤ 2MB (قصّ/تحجيم/ضغط) ---
  private async encodeSquareWebpUnder2MB(
    inputPath: string,
    maxBytes = 2 * 1024 * 1024,
  ): Promise<string> {
    const outPath = `${inputPath}.processed.webp`;
    const meta = await sharp(inputPath).metadata();
    if (!meta.width || !meta.height)
      throw new BadRequestException('تعذّر قراءة أبعاد الصورة');
    const size = Math.min(meta.width, meta.height);

    // جرّب بجودة متدرجة حتى تقل عن 2MB
    for (const quality of [90, 80, 70, 60, 50]) {
      await sharp(inputPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .toFormat('webp', { quality })
        .toFile(outPath);
      const stat = await fs.stat(outPath);
      if (stat.size <= maxBytes) return outPath;
    }
    // لو فشل، آخر محاولة بجودة 40
    await sharp(inputPath)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .toFormat('webp', { quality: 40 })
      .toFile(outPath);
    const stat = await fs.stat(outPath);
    if (stat.size > maxBytes) {
      await unlink(outPath).catch(() => null);
      throw new BadRequestException('الصورة أكبر من 2MB حتى بعد الضغط');
    }
    return outPath;
  }

  async uploadCategoryImageToMinio(
    categoryId: string,
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const cat = await this.categoryModel.findOne({
      _id: categoryId,
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!cat) throw new CategoryNotFoundError(categoryId);

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    const maxBytes = 2 * 1024 * 1024;
    if (!allowed.includes(file.mimetype)) {
      try {
        await unlink(file.path);
      } catch {}
      throw new BadRequestException('صيغة الصورة غير مدعومة');
    }

    // إن كانت أكبر من 2MB سنعتمد التحويل لاحقًا، لكن نسمح بالمدخل ثم نضغطه.
    const bucket = process.env.MINIO_BUCKET!;
    await this.ensureBucket(bucket as any);

    const processedPath = await this.encodeSquareWebpUnder2MB(
      file.path,
      maxBytes,
    ); // ← يضمن مربّع و≤2MB
    const key = `merchants/${merchantId}/categories/${categoryId}/image-${Date.now()}.webp`;

    try {
      await this.minio.fPutObject(bucket, key, processedPath, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      const url = await this.publicUrlFor(bucket as any, key);
      cat.image = url;
      await cat.save();
      return url;
    } catch (e) {
      this.logger.error('MinIO upload failed', e as any);
      throw new InternalServerErrorException('STORAGE_UPLOAD_FAILED');
    } finally {
      await unlink(file.path).catch(() => null);
      await unlink(processedPath).catch(() => null);
    }
  }

  private async ensureBucket(bucket: string) {
    const exists = await this.minio.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(
        bucket,
        process.env.MINIO_REGION || 'us-east-1',
      );
    }
  }

  private async publicUrlFor(bucket: string, key: string): Promise<string> {
    const cdnBase = (process.env.ASSETS_CDN_BASE_URL || '').replace(/\/+$/, '');
    const minioPublic = (process.env.MINIO_PUBLIC_URL || '').replace(
      /\/+$/,
      '',
    );
    if (cdnBase) return `${cdnBase}/${bucket}/${key}`;
    if (minioPublic) return `${minioPublic}/${bucket}/${key}`;
    // آخر حل: رابط موقّت
    return this.minio.presignedUrl('GET', bucket, key, 7 * 24 * 60 * 60);
  }
  async getDescendantIds(
    merchantId: string | Types.ObjectId,
    rootId: string | Types.ObjectId,
  ): Promise<Types.ObjectId[]> {
    const mId = new Types.ObjectId(merchantId);
    const rId = new Types.ObjectId(rootId);
    const all = await this.categoryModel
      .find({ merchantId: mId, $or: [{ _id: rId }, { ancestors: rId }] })
      .select('_id')
      .lean();
    return all.map((d) => d._id as Types.ObjectId);
  }
}
