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
    const { sortField, sortOrder, populate, select, lean } =
      this.extractOptions(options);
    const filter = createCursorFilter(
      baseFilter,
      dto.cursor,
      sortField,
      sortOrder,
    );
    const sort = this.createSortObject(sortField, sortOrder);
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const queryOptions: {
      populate?: string | string[];
      select?: string;
      lean: boolean;
    } = { lean };

    if (populate) queryOptions.populate = populate;
    if (select) queryOptions.select = select;

    const docs = await this.executeQuery(
      model,
      filter,
      sort,
      limit + 1,
      queryOptions,
    );
    const { items, hasMore } = this.processResults(docs, limit);

    const meta: { nextCursor?: string; hasMore: boolean; count: number } = {
      hasMore,
      count: items.length,
    };

    if (hasMore) {
      const cursor = extractNextCursor(items, sortField);
      if (cursor) meta.nextCursor = cursor;
    }

    return { items: items as unknown as T[], meta };
  }

  private extractOptions(options: {
    sortField?: string;
    sortOrder?: 1 | -1;
    populate?: string | string[];
    select?: string;
    lean?: boolean;
  }) {
    return {
      sortField: options.sortField ?? DEFAULT_SORT_FIELD,
      sortOrder: options.sortOrder ?? DEFAULT_SORT_ORDER,
      populate: options.populate,
      select: options.select,
      lean: options.lean ?? true,
    };
  }

  private createSortObject(
    sortField: string,
    sortOrder: 1 | -1,
  ): Record<string, 1 | -1> {
    return { [sortField]: sortOrder, _id: sortOrder };
  }

  private async executeQuery<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    sort: Record<string, 1 | -1>,
    limit: number,
    options: { populate?: string | string[]; select?: string; lean: boolean },
  ): Promise<unknown[]> {
    const q = model.find(filter).sort(sort).limit(limit);
    if (options.populate) q.populate(options.populate);
    if (options.select) q.select(options.select);
    return options.lean ? await q.lean().exec() : await q.exec();
  }

  private processResults(
    docs: unknown[],
    limit: number,
  ): { items: unknown[]; hasMore: boolean } {
    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    return { items, hasMore };
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

    const indexOptions: Record<string, unknown> = {
      background: options.background !== false,
    };

    if (options.sparse !== undefined) {
      indexOptions.sparse = options.sparse;
    }

    schema.index(indexFields, indexOptions as IndexOptions);
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
