// src/modules/products/repositories/mongo-attribute-definitions.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  AttributeDefinition,
  AttributeDefinitionDocument,
} from '../schemas/attribute-definition.schema';

import type { AttributeDefinitionsRepository } from './attribute-definitions.repository';

@Injectable()
export class MongoAttributeDefinitionsRepository
  implements AttributeDefinitionsRepository
{
  constructor(
    @InjectModel(AttributeDefinition.name)
    private readonly model: Model<AttributeDefinitionDocument>,
  ) {}

  create(
    data: Partial<AttributeDefinition>,
  ): Promise<AttributeDefinitionDocument> {
    const doc = new this.model(data);
    return doc.save();
  }

  listByMerchant(
    merchantId: Types.ObjectId,
  ): Promise<AttributeDefinitionDocument[]> {
    return this.model
      .find({ merchantId })
      .sort({ createdAt: -1, _id: -1 })
      .exec();
  }

  findByIdScoped(
    id: Types.ObjectId,
    merchantId: Types.ObjectId,
  ): Promise<AttributeDefinitionDocument | null> {
    return this.model.findOne({ _id: id, merchantId }).exec();
  }

  updateById(
    id: Types.ObjectId,
    set: Partial<AttributeDefinition>,
  ): Promise<AttributeDefinitionDocument | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true })
      .exec();
  }
}
