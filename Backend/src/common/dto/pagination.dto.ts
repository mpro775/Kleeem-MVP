import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Types } from 'mongoose';

import {
  MIN_LIMIT,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
} from '../constants/common';

/**
 * DTO موحد للـ Cursor Pagination
 */
export class CursorDto {
  @ApiPropertyOptional({
    description: 'عدد العناصر المطلوبة (1-100)',
    minimum: MIN_LIMIT,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(MIN_LIMIT)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Cursor للصفحة التالية (base64 encoded)',
    example:
      'eyJ0IjoxNjk5ODg4ODAwMDAwLCJpZCI6IjY1NGY5YzAwMTIzNDU2Nzg5YWJjZGVmMCJ9',
  })
  @IsOptional()
  cursor?: string;
}

/**
 * نتيجة الـ Pagination
 */
export interface PaginationResult<T> {
  items: T[];
  meta: {
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  };
}

/**
 * تشفير الـ cursor
 */
export function encodeCursor(timestamp: number, id: string): string {
  return Buffer.from(JSON.stringify({ t: timestamp, id })).toString('base64');
}

/**
 * فك تشفير الـ cursor
 */
export function decodeCursor(
  cursor?: string,
): { t: number; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString()) as {
      t: number;
      id: string;
    };
    if (typeof decoded.t === 'number' && typeof decoded.id === 'string') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * إنشاء filter للـ cursor pagination
 */
export function createCursorFilter(
  baseFilter: Record<string, unknown>,
  cursor?: string,
  sortField: string = DEFAULT_SORT_FIELD,
  sortOrder: 1 | -1 = DEFAULT_SORT_ORDER, // NEW: مرّر اتجاه الفرز
): Record<string, unknown> {
  const filter = { ...baseFilter };
  const decoded = decodeCursor(cursor);
  if (!decoded) return filter;

  const op = sortOrder === DEFAULT_SORT_ORDER ? '$lt' : '$gt';
  const cursorDate = new Date(decoded.t);
  const cursorId = Types.ObjectId.isValid(decoded.id)
    ? new Types.ObjectId(decoded.id)
    : decoded.id; // fallback لكن يفضّل دائمًا ObjectId

  filter.$or = [
    { [sortField]: { [op]: cursorDate } },
    { [sortField]: cursorDate, _id: { [op]: cursorId } },
  ];
  return filter;
}
