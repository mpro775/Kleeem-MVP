import type { DocumentSchemaClass } from '../schemas/document.schema';
import type { Types, HydratedDocument } from 'mongoose';

export interface DocumentsRepository {
  create(
    data: Partial<DocumentSchemaClass>,
  ): Promise<HydratedDocument<DocumentSchemaClass>>;
  findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ): Promise<HydratedDocument<DocumentSchemaClass> | null>;
  listByMerchant(merchantId: string | Types.ObjectId): Promise<unknown[]>; // lean
  deleteByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ): Promise<void>;
}
