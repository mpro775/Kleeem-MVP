// src/modules/vector/vector.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';

import { CommonModule } from '../../common/config/common.module';
import { ProductsModule } from '../products/products.module';

import { EmbeddingsClient } from './utils/embeddings.client';
import { QdrantWrapper } from './utils/qdrant.client';
import { VectorController } from './vector.controller';
import { VectorService } from './vector.service';

@Module({
  imports: [HttpModule, forwardRef(() => ProductsModule), CommonModule],
  providers: [VectorService, QdrantWrapper, EmbeddingsClient],
  controllers: [VectorController],
  exports: [VectorService, QdrantWrapper, EmbeddingsClient],
})
export class VectorModule {}
