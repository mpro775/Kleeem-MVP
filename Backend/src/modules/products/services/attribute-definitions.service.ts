// src/modules/products/services/attribute-definitions.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { AttributeDefinitionsRepository } from '../repositories/attribute-definitions.repository';
import {
  AttributeDefinition,
  AttributeDefinitionDocument,
} from '../schemas/attribute-definition.schema';

@Injectable()
export class AttributeDefinitionsService {
  constructor(
    @Inject(AttributeDefinitionsRepository)
    private readonly repo: AttributeDefinitionsRepository,
  ) {}

  async create(
    merchantId: string,
    data: Partial<AttributeDefinition>,
  ): Promise<AttributeDefinitionDocument> {
    return this.repo.create({
      ...data,
      merchantId: new Types.ObjectId(merchantId),
    });
  }

  listByMerchant(merchantId: string): Promise<AttributeDefinitionDocument[]> {
    return this.repo.listByMerchant(new Types.ObjectId(merchantId));
  }

  async updateScoped(
    id: string,
    merchantId: string,
    set: Partial<AttributeDefinition>,
  ): Promise<AttributeDefinitionDocument> {
    const doc = await this.repo.updateById(new Types.ObjectId(id), set);
    if (!doc || doc.merchantId.toString() !== merchantId) {
      throw new NotFoundException('Attribute definition not found');
    }
    return doc;
  }

  async findByIdScoped(
    id: string,
    merchantId: string,
  ): Promise<AttributeDefinitionDocument> {
    const doc = await this.repo.findByIdScoped(
      new Types.ObjectId(id),
      new Types.ObjectId(merchantId),
    );
    if (!doc) throw new NotFoundException('Attribute definition not found');
    return doc;
  }
}
