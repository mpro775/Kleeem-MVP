// src/modules/products/repositories/attribute-definitions.repository.ts
import type {
  AttributeDefinition,
  AttributeDefinitionDocument,
} from '../schemas/attribute-definition.schema';
import type { Types } from 'mongoose';

export interface AttributeDefinitionsRepository {
  create(
    data: Partial<AttributeDefinition>,
  ): Promise<AttributeDefinitionDocument>;

  listByMerchant(
    merchantId: Types.ObjectId,
  ): Promise<AttributeDefinitionDocument[]>;

  findByIdScoped(
    id: Types.ObjectId,
    merchantId: Types.ObjectId,
  ): Promise<AttributeDefinitionDocument | null>;

  updateById(
    id: Types.ObjectId,
    set: Partial<AttributeDefinition>,
  ): Promise<AttributeDefinitionDocument | null>;
}

export const AttributeDefinitionsRepository = Symbol(
  'AttributeDefinitionsRepository',
);
