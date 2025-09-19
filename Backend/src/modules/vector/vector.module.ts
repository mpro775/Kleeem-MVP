// src/modules/vector/vector.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { VectorService } from './vector.service';
import { VectorController } from './vector.controller';
import { QdrantWrapper } from './utils/qdrant.client';
import { EmbeddingsClient } from './utils/embeddings.client';

import { ProductsModule } from '../products/products.module';
import { CommonModule } from '../../common/config/common.module';

@Module({
  imports: [HttpModule, forwardRef(() => ProductsModule), CommonModule],
  providers: [VectorService, QdrantWrapper, EmbeddingsClient],
  controllers: [VectorController],
  exports: [VectorService, QdrantWrapper, EmbeddingsClient],
})
export class VectorModule {}
