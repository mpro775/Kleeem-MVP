import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Types } from 'mongoose';

/**
 * DTO موحد للـ Cursor Pagination
 */
export class CursorDto {
  @ApiPropertyOptional({
    description: 'عدد العناصر المطلوبة (1-100)',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

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
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
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
  baseFilter: any,
  cursor?: string,
  sortField: string = 'createdAt',
  sortOrder: 1 | -1 = -1, // NEW: مرّر اتجاه الفرز
): any {
  const filter = { ...baseFilter };
  const decoded = decodeCursor(cursor);
  if (!decoded) return filter;

  const op = sortOrder === -1 ? '$lt' : '$gt';
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
