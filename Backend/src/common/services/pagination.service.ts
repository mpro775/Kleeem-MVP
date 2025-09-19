import { Injectable } from '@nestjs/common';
import { Model, Document, FilterQuery } from 'mongoose';
import {
  CursorDto,
  PaginationResult,
  encodeCursor,
  createCursorFilter,
} from '../dto/pagination.dto';

/**
 * خدمة أساسية للـ Cursor Pagination
 */
@Injectable()
export class PaginationService {
  /**
   * تنفيذ cursor pagination موحد
   */
  async paginate<T extends Document>(
    model: Model<T>,
    dto: CursorDto,
    baseFilter: FilterQuery<T> = {},
    options: {
      sortField?: string;
      sortOrder?: 1 | -1;
      populate?: string | string[];
      select?: string;
      lean?: boolean;
    } = {},
  ): Promise<PaginationResult<T>> {
    const {
      sortField = 'createdAt',
      sortOrder = -1,
      populate,
      select,
      lean = true,
    } = options;

    // إنشاء الـ filter مع الـ cursor
    const filter = createCursorFilter(baseFilter, dto.cursor, sortField);

    // إنشاء الـ sort object
    const sort = {
      [sortField]: sortOrder,
      _id: sortOrder, // ضمان الترتيب المستقر
    };

    // حد أقصى للـ limit
    const limit = Math.min(dto.limit || 20, 100);

    // بناء الاستعلام مع معالجة أفضل للأنواع
    const baseQuery = model.find(filter).sort(sort).limit(limit);

    if (populate) {
      baseQuery.populate(populate);
    }

    if (select) {
      baseQuery.select(select);
    }

    // تنفيذ الاستعلام مع معالجة النوع حسب lean
    const items = lean ? await baseQuery.lean().exec() : await baseQuery.exec();

    // إنشاء الـ cursor للصفحة التالية
    const lastItem = items[items.length - 1] as any;
    let nextCursor: string | undefined;

    if (lastItem) {
      const timestampValue = lastItem[sortField];
      const timestamp =
        timestampValue instanceof Date ? timestampValue.getTime() : Date.now();
      nextCursor = encodeCursor(timestamp, String(lastItem._id));
    }

    return {
      items: items as T[],
      meta: {
        nextCursor,
        hasMore: items.length === limit,
        count: items.length,
      },
    } as PaginationResult<T>;
  }

  /**
   * إنشاء فهرس مركب للـ pagination
   */
  static createPaginationIndex(
    schema: any,
    fields: Record<string, 1 | -1>,
    options: { background?: boolean; sparse?: boolean } = {},
  ) {
    // إضافة createdAt و _id للفهرس إذا لم يكونا موجودين
    const indexFields = {
      ...fields,
      createdAt: fields.createdAt || -1,
      _id: fields._id || -1,
    };

    schema.index(indexFields, {
      background: options.background !== false,
      sparse: options.sparse,
    });
  }

  /**
   * إنشاء فهرس نصي للبحث
   */
  static createTextIndex(
    schema: any,
    fields: Record<string, 'text'>,
    weights: Record<string, number> = {},
    options: { background?: boolean } = {},
  ) {
    schema.index(fields, {
      weights,
      background: options.background !== false,
    });
  }
}
