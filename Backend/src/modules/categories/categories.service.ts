// ============ External imports ============
import { promises as fs } from 'fs';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import sharp from 'sharp';
import slugify from 'slugify';

// ============ Internal imports ============
import { CategoryNotFoundError } from '../../common/errors/business-errors';

import { CreateCategoryDto } from './dto/create-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesRepository } from './repositories/categories.repository';

import type { Category, CategoryDocument } from './schemas/category.schema';
import type * as Minio from 'minio';

// ============ Constants ============
const BYTES_PER_MB = 1_048_576;
const TWO_MB = 2 * BYTES_PER_MB;
const DEFAULT_MINIO_REGION = 'us-east-1';

const MIN_WEBP_QUALITY = 50;
const DEFAULT_WEBP_QUALITY = 40;
const MAX_WEBP_QUALITY = 90;
const HIGH_WEBP_QUALITY = 80;
const MEDIUM_HIGH_WEBP_QUALITY = 70;
const MEDIUM_WEBP_QUALITY = 60;

const WEBP_QUALITIES: readonly number[] = [
  MAX_WEBP_QUALITY,
  HIGH_WEBP_QUALITY,
  MEDIUM_HIGH_WEBP_QUALITY,
  MEDIUM_WEBP_QUALITY,
  MIN_WEBP_QUALITY,
];
const FALLBACK_WEBP_QUALITY = DEFAULT_WEBP_QUALITY;

const unlink = fs.unlink;

// ============ Helper Types ============
interface Sibling {
  _id: Types.ObjectId;
  order: number;
  name: string;
}

interface LeanCategoryBasic {
  _id: Types.ObjectId;
  parent?: Types.ObjectId | null;
  order: number;
  name: string;
  [k: string]: unknown;
}

interface TreeCategory extends LeanCategoryBasic {
  children: TreeCategory[];
}

// ============ Type Guards & Utils ============
function isRecord<T extends string = string>(
  v: unknown,
): v is Record<T, unknown> {
  return typeof v === 'object' && v !== null;
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

function assertArray<T = unknown>(v: unknown): v is T[] {
  return Array.isArray(v);
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @Inject('CategoriesRepository') private readonly repo: CategoriesRepository,
    @Inject('MINIO_CLIENT') private readonly minio: Minio.Client,
  ) {}

  // -------- path/ancestors calculation --------
  private async computePathAncestors(
    merchantId: Types.ObjectId,
    parentId?: string | null,
    slug?: string,
  ): Promise<{ ancestors: Types.ObjectId[]; depth: number; path: string }> {
    let ancestors: Types.ObjectId[] = [];
    let depth = 0;
    let basePath = '';

    if (parentId) {
      const parent = await this.repo.findLeanByIdForMerchant(
        parentId,
        merchantId,
      );
      if (!parent) {
        throw new BadRequestException('Parent not found for this merchant');
      }
      const pAnc =
        isRecord(parent) && assertArray<Types.ObjectId>(parent.ancestors)
          ? parent.ancestors
          : (parent.ancestors ?? []);
      ancestors = [...pAnc, parent._id];
      depth = ancestors.length;
      basePath =
        ((parent as unknown as Record<string, unknown>).path as string) ?? '';
    }

    const path = basePath ? `${basePath}/${slug ?? ''}` : (slug ?? '');
    return { ancestors, depth, path };
  }

  // -------- CRUD-ish --------
  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const merchantId = new Types.ObjectId(dto.merchantId);
    const computedSlug =
      dto.slug ??
      slugify(dto.name, { lower: true, strict: true, locale: 'ar' });

    const { ancestors, depth, path } = await this.computePathAncestors(
      merchantId,
      dto.parent ?? null,
      computedSlug,
    );

    const { parent, ...rest } = dto;
    return this.repo.createCategory({
      ...rest,
      slug: computedSlug,
      merchantId,
      ancestors,
      depth,
      path,
      order: dto.order ?? 0,
      parent: parent ? new Types.ObjectId(parent) : null,
    } as Partial<CategoryDocument>);
  }

  async findAllFlat(merchantId: string): Promise<CategoryDocument[]> {
    return this.repo.findAllByMerchant(new Types.ObjectId(merchantId));
  }

  async findAllTree(merchantId: string): Promise<TreeCategory[]> {
    const all = await this.repo.findAllByMerchant(
      new Types.ObjectId(merchantId),
    );
    const map = new Map<string, TreeCategory>();

    // بناء خرائط آمنة بالنوع
    for (const c of all as unknown as LeanCategoryBasic[]) {
      map.set(String(c._id), { ...c, children: [] });
    }

    const roots: TreeCategory[] = [];
    for (const c of all as unknown as LeanCategoryBasic[]) {
      const id = String(c._id);
      const node = map.get(id);
      if (!node) continue;
      if (c.parent) {
        const parent = map.get(String(c.parent));
        parent?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortChildren = (node: TreeCategory): void => {
      node.children.sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      );
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    return roots;
  }

  async breadcrumbs(
    id: string,
    merchantId: string,
  ): Promise<Pick<Category, 'name' | 'slug' | 'path' | 'depth'>[]> {
    const mId = new Types.ObjectId(merchantId);
    const doc = await this.repo.findLeanByIdForMerchant(id, mId);
    if (!doc) throw new CategoryNotFoundError(id);

    const ancestors = doc.ancestors ?? [];
    const ids = [...ancestors, doc._id];
    const rows = await this.repo.findManyByIds(ids, {
      name: 1,
      slug: 1,
      path: 1,
      depth: 1,
    });
    return rows.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
  }

  async subtree(id: string, merchantId: string): Promise<TreeCategory> {
    const mId = new Types.ObjectId(merchantId);
    const root = await this.repo.findLeanByIdForMerchant(id, mId);
    if (!root) throw new CategoryNotFoundError(id);

    const allIds = await this.repo.findSubtreeIds(mId, root._id);
    const all = await this.repo.findManyByIds(allIds);
    const map = new Map<string, TreeCategory>();

    for (const c of all as unknown as LeanCategoryBasic[]) {
      map.set(String(c._id), { ...c, children: [] });
    }
    for (const c of all as unknown as LeanCategoryBasic[]) {
      if (c.parent) {
        map.get(String(c.parent))?.children.push(map.get(String(c._id))!);
      }
    }
    return map.get(String(root._id))!;
  }

  async findOne(id: string, merchantId: string): Promise<CategoryDocument> {
    const mId = new Types.ObjectId(merchantId);
    const cat = await this.repo.findByIdForMerchant(id, mId);
    if (!cat) throw new CategoryNotFoundError(id);
    return cat;
  }

  private async updateParent(
    cat: CategoryDocument,
    newParentId: string | null,
    merchantId: Types.ObjectId,
  ): Promise<void> {
    const newParent = newParentId ? new Types.ObjectId(newParentId) : null;

    if (newParent && newParent.equals(cat._id)) {
      throw new BadRequestException('Cannot set parent to itself');
    }

    if (newParent) {
      const exists = await this.repo.parentExistsForMerchant(
        newParent,
        merchantId,
      );
      if (!exists) throw new BadRequestException('Parent category not found');

      const loop = await this.repo.isDescendant(newParent, cat._id, merchantId);
      if (loop) {
        throw new BadRequestException('Cannot move under its own descendant');
      }
    }

    cat.parent = newParent;
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    const mId = new Types.ObjectId(merchantId);
    const cat = await this.repo.findByIdForMerchant(id, mId);
    if (!cat) throw new CategoryNotFoundError(id);

    // حماية من تعديل merchantId في DTO
    if (Object.prototype.hasOwnProperty.call(dto, 'merchantId')) {
      delete dto.merchantId;
    }

    if (dto.parent !== undefined) {
      await this.updateParent(cat, dto.parent, mId);
    }

    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.description !== undefined) cat.description = dto.description ?? '';
    if (dto.image !== undefined) cat.image = dto.image ?? '';
    if (dto.keywords !== undefined) cat.keywords = dto.keywords ?? [];

    await cat.save();
    return cat;
  }

  // -------- ordering/move --------
  private async calcNewOrder(
    merchantId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    opts: {
      afterId?: string | null;
      beforeId?: string | null;
      position?: number | null;
    },
  ): Promise<number> {
    const siblings = (await this.repo.listSiblings(
      merchantId,
      parentId,
    )) as Sibling[];
    if (siblings.length === 0) return 0;

    if (opts.position != null) {
      const pos = Math.max(0, Math.min(opts.position, siblings.length));
      return pos;
    }

    if (opts.afterId) {
      const idx = siblings.findIndex((s) => String(s._id) === opts.afterId);
      if (idx === -1) throw new BadRequestException('afterId not in siblings');
      return idx + 1;
    }

    if (opts.beforeId) {
      const idx = siblings.findIndex((s) => String(s._id) === opts.beforeId);
      if (idx === -1) throw new BadRequestException('beforeId not in siblings');
      return idx;
    }

    return siblings.length;
  }

  async move(
    id: string,
    merchantId: string,
    dto: MoveCategoryDto,
  ): Promise<CategoryDocument> {
    const mId = new Types.ObjectId(merchantId);
    const current = await this.repo.findByIdForMerchant(id, mId);
    if (!current) throw new CategoryNotFoundError(id);

    const hasParentKey: boolean = Object.hasOwn(dto as object, 'parent');
    const parentValue: string | null | undefined = dto.parent;
    const newParentId: Types.ObjectId | null = hasParentKey
      ? parentValue && typeof parentValue === 'string'
        ? new Types.ObjectId(parentValue)
        : null
      : (current.parent ?? null);

    if (newParentId) {
      const isDescendant = await this.repo.isDescendant(
        newParentId,
        current._id,
        mId,
      );
      if (isDescendant) {
        throw new BadRequestException('Cannot move under its own descendant');
      }
    }

    const session = await this.repo.startSession();
    await session.withTransaction(async () => {
      const newOrder = await this.calcNewOrder(mId, newParentId, {
        afterId: dto.afterId ?? null,
        beforeId: dto.beforeId ?? null,
        position: dto.position ?? null,
      });

      const parentChanged =
        String(newParentId ?? '') !== String(current.parent ?? '');

      if (parentChanged) {
        await this.update(id, merchantId, {
          parent: newParentId ? String(newParentId) : null,
        } as UpdateCategoryDto);
      }

      await this.repo.updateOrder(current._id, newOrder, session);
      await this.repo.normalizeSiblingsOrders(mId, newParentId, session);

      if (parentChanged) {
        await this.repo.normalizeSiblingsOrders(
          mId,
          current.parent ?? null,
          session,
        );
      }
    });
    await session.endSession();

    return this.repo.findByIdForMerchant(
      current._id,
      mId,
    ) as Promise<CategoryDocument>;
  }

  async remove(
    id: string,
    merchantId: string,
    cascade = false,
  ): Promise<{ message: string }> {
    const mId = new Types.ObjectId(merchantId);
    const node = await this.repo.findLeanByIdForMerchant(id, mId);
    if (!node) throw new CategoryNotFoundError(id);

    const ids = await this.repo.findSubtreeIds(mId, node._id);
    const hasProducts = await this.repo.anyProductsInCategories(mId, ids);
    if (hasProducts) {
      throw new BadRequestException('لا يمكن حذف فئة مرتبطة بمنتجات');
    }

    const hasChildren = ids.length > 1;
    if (hasChildren && !cascade) {
      throw new BadRequestException(
        'Category has children. استخدم ?cascade=true لحذف الشجرة.',
      );
    }

    await this.repo.deleteManyByIds(mId, ids);
    return {
      message: hasChildren
        ? 'Category subtree deleted successfully'
        : 'Category deleted successfully',
    };
  }

  // -------- MinIO image handling --------
  private async encodeSquareWebpUnder2MB(
    inputPath: string,
    maxBytes = TWO_MB,
  ): Promise<string> {
    const outPath = `${inputPath}.processed.webp`;
    const meta = await sharp(inputPath).metadata();
    if (!meta.width || !meta.height) {
      throw new BadRequestException('تعذّر قراءة أبعاد الصورة');
    }
    const size = Math.min(meta.width, meta.height);

    for (const quality of WEBP_QUALITIES) {
      await sharp(inputPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .toFormat('webp', { quality })
        .toFile(outPath);

      const stat = await fs.stat(outPath);
      if (stat.size <= maxBytes) return outPath;
    }

    await sharp(inputPath)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .toFormat('webp', { quality: FALLBACK_WEBP_QUALITY })
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
    const cat = await this.repo.findByIdForMerchant(
      categoryId,
      new Types.ObjectId(merchantId),
    );
    if (!cat) throw new CategoryNotFoundError(categoryId);

    const allowed = ['image/png', 'image/jpeg', 'image/webp'] as const;
    const maxBytes = TWO_MB;

    if (!allowed.includes(file.mimetype as (typeof allowed)[number])) {
      await unlink(file.path).catch(() => null);
      throw new BadRequestException('صيغة الصورة غير مدعومة');
    }

    const bucket = (process.env.MINIO_BUCKET ?? '').trim();
    if (!bucket)
      throw new InternalServerErrorException('MINIO_BUCKET not configured');

    await this.ensureBucket(bucket);

    const processedPath = await this.encodeSquareWebpUnder2MB(
      file.path,
      maxBytes,
    );
    const key = `merchants/${merchantId}/categories/${categoryId}/image-${Date.now()}.webp`;

    try {
      await this.minio.fPutObject(bucket, key, processedPath, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      const url = await this.publicUrlFor(bucket, key);
      cat.image = url;
      await cat.save();
      return url;
    } catch (e) {
      this.logger.error('MinIO upload failed', e);
      throw new InternalServerErrorException('STORAGE_UPLOAD_FAILED');
    } finally {
      await unlink(file.path).catch(() => null);
      await unlink(processedPath).catch(() => null);
    }
  }

  private async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.minio.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(
        bucket,
        process.env.MINIO_REGION || DEFAULT_MINIO_REGION,
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
    // 7 days
    return this.minio.presignedUrl('GET', bucket, key, 7 * 24 * 60 * 60);
  }

  async getDescendantIds(
    merchantId: string | Types.ObjectId,
    rootId: string | Types.ObjectId,
  ): Promise<Types.ObjectId[]> {
    const mId = toObjectId(merchantId);
    const rId = toObjectId(rootId);
    return this.repo.findSubtreeIds(mId, rId);
  }
}
