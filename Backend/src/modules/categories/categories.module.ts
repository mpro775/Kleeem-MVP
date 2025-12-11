// src/modules/categories/categories.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { CommonModule } from '../../common/config/common.module';
import { StorageModule } from '../../common/storage/storage.module';
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
    StorageModule,
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: 'CategoriesRepository',
      useClass: MongoCategoriesRepository,
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
