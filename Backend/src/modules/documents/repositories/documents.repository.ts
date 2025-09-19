import { Types, HydratedDocument } from 'mongoose';
import { DocumentSchemaClass } from '../schemas/document.schema';

export interface DocumentsRepository {
  create(
    data: Partial<DocumentSchemaClass>,
  ): Promise<HydratedDocument<DocumentSchemaClass>>;
  findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ): Promise<HydratedDocument<DocumentSchemaClass> | null>;
  listByMerchant(merchantId: string | Types.ObjectId): Promise<any[]>; // lean
  deleteByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ): Promise<void>;
}
