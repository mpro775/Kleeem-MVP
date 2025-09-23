import type { User } from './schemas/user.schema';
import type { FilterQuery, Model } from 'mongoose';
import type {
  CursorDto,
  PaginationResult,
} from 'src/common/dto/pagination.dto';

// نوع المخرجات عند استخدام lean + إخفاء الحقول
export type UserLean = Omit<User, 'password' | 'merchantId'> & {
  _id: string; // بعد تحويله لسلسلة
  merchantId?: string; // بعد تحويله لسلسلة (إن وجد)
  createdAt?: Date;
  updatedAt?: Date;
};

// منفذ عام لخدمة الترقيم (Generics)
export interface PaginatePort<TDoc, TOut> {
  paginate(
    model: Model<TDoc>,
    dto: CursorDto & { sortBy?: string; sortOrder?: 1 | -1 },
    filter: FilterQuery<TDoc>,
    options: {
      sortField: string;
      sortOrder: 1 | -1;
      select?: string;
      lean?: boolean;
    },
  ): Promise<PaginationResult<TOut>>;
}
