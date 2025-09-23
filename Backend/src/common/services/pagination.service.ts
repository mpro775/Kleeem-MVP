// src/common/services/pagination.service.ts

// external
import { Injectable } from '@nestjs/common';

import {
  CursorDto,
  type PaginationResult,
  encodeCursor,
  createCursorFilter,
} from '../dto/pagination.dto';

import type {
  Document,
  FilterQuery,
  IndexOptions,
  Model,
  Schema,
} from 'mongoose';

// internal

// -----------------------------------------------------------------------------
// Constants (no-magic-numbers)
const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_ORDER: 1 | -1 = -1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// -----------------------------------------------------------------------------
// Helpers
function firstOrUndefined<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toTimestamp(value: unknown): number | undefined {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? undefined : ts;
  }
  return undefined;
}

function extractNextCursor(
  items: unknown[],
  sortField: string,
): string | undefined {
  const last = firstOrUndefined(items);
  if (!isRecord(last)) return undefined;

  const ts = toTimestamp(last[sortField]);
  const id =
    isRecord(last) && typeof last._id === 'string'
      ? last._id
      : (last._id?.toString() ?? '');
  if (ts === undefined || !id) return undefined;

  return encodeCursor(ts, id);
}

// -----------------------------------------------------------------------------

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
      sortField = DEFAULT_SORT_FIELD,
      sortOrder = DEFAULT_SORT_ORDER,
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

    // إنشاء الـ sort object (ترتيب مستقر بإضافة _id)
    const sort: Record<string, 1 | -1> = {
      [sortField]: sortOrder,
      _id: sortOrder,
    };

    // حد أقصى للـ limit
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // بناء الاستعلام مع limit + 1 للتحقق من وجود المزيد
    const q = model
      .find(filter)
      .sort(sort)
      .limit(limit + 1);
    if (populate) q.populate(populate);
    if (select) q.select(select);

    // تنفيذ الاستعلام
    const docs = lean ? await q.lean().exec() : await q.exec();

    // حساب hasMore وتقطيع النتيجة
    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    // إنشاء الـ cursor للصفحة التالية (إن وُجدت)
    const nextCursor = hasMore
      ? extractNextCursor(items, sortField)
      : undefined;

    return {
      items: items as unknown as T[],
      meta: {
        nextCursor,
        hasMore,
        count: items.length,
      },
    };
  }

  /**
   * إنشاء فهرس مركب للـ pagination
   */
  static createPaginationIndex(
    schema: Schema,
    fields: Record<string, 1 | -1>,
    options: Partial<Pick<IndexOptions, 'background' | 'sparse'>> = {},
  ): void {
    // إضافة createdAt و _id للفهرس إذا لم يكونا موجودين
    const indexFields: Record<string, 1 | -1> = {
      ...fields,
      createdAt: fields.createdAt ?? -1,
      _id: fields._id ?? -1,
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
    schema: Schema,
    fields: Record<string, 'text'>,
    weights: Record<string, number> = {},
    options: Partial<Pick<IndexOptions, 'background'>> = {},
  ): void {
    schema.index(fields, {
      weights,
      background: options.background !== false,
    });
  }
}
