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
    const filter = createCursorFilter(
      baseFilter,
      dto.cursor,
      sortField,
      sortOrder,
    );

    // إنشاء الـ sort object
    const sort = {
      [sortField]: sortOrder,
      _id: sortOrder, // ضمان الترتيب المستقر
    };

    // حد أقصى للـ limit
    const limit = Math.min(dto.limit ?? 20, 100);

    // بناء الاستعلام مع limit + 1 للتحقق من وجود المزيد
    const q = model
      .find(filter)
      .sort(sort)
      .limit(limit + 1);

    if (populate) {
      q.populate(populate);
    }

    if (select) {
      q.select(select);
    }

    // تنفيذ الاستعلام
    const docs = lean ? await q.lean().exec() : await q.exec();

    // حساب hasMore وتقطيع النتيجة
    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    // إنشاء الـ cursor للصفحة التالية (فقط إذا كان هناك المزيد)
    const last = items[items.length - 1] as any;
    let nextCursor: string | undefined;

    if (last) {
      const tsVal = last[sortField];
      const ts =
        tsVal instanceof Date ? tsVal.getTime() : new Date(tsVal).getTime();
      nextCursor = encodeCursor(ts, String(last._id));
    }

    return {
      items: items as T[],
      meta: {
        nextCursor: hasMore ? nextCursor : undefined,
        hasMore,
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
