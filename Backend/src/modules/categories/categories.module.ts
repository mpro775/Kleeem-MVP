// src/modules/categories/categories.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import * as Minio from 'minio';

import { CommonModule } from '../../common/config/common.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { MongoCategoriesRepository } from './repositories/mongo-categories.repository';
import { Category, CategorySchema } from './schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    MulterModule.register({ dest: './uploads' }),
    CommonModule, // للوصول إلى TranslationService
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: 'CategoriesRepository',
      useClass: MongoCategoriesRepository,
    },
    {
      provide: 'MINIO_CLIENT',
      useFactory: () =>
        new Minio.Client({
          endPoint: process.env.MINIO_ENDPOINT!,
          port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY!,
          secretKey: process.env.MINIO_SECRET_KEY!,
        }),
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
