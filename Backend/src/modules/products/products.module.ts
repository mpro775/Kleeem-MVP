// src/modules/products/products.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ScrapeQueue } from './scrape.queue';

import { ScraperModule } from '../scraper/scraper.module';
import { VectorModule } from '../vector/vector.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ProductsImportService } from './products-import.service';
import { ProductSetupConfigService } from './product-setup-config.service';
import {
  ProductSetupConfig,
  ProductSetupConfigSchema,
} from './schemas/product-setup-config.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { ZidModule } from '../integrations/zid/zid.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductSetupConfig.name, schema: ProductSetupConfigSchema }, // ← أضف هذا
      { name: Category.name, schema: CategorySchema }, // أضف هذا السطر!
    ]),
    forwardRef(() => ScraperModule),
    BullModule.registerQueue({ name: 'scrape' }),
    forwardRef(() => VectorModule), // ← حوّل هنا إلى forwardRef
    forwardRef(() => AnalyticsModule),
    forwardRef(() => ZidModule),
  ],
  providers: [
    ProductsService,
    ScrapeQueue,
    ProductsImportService,
    ProductSetupConfigService,
  ],
  controllers: [ProductsController],
  exports: [ProductsService, MongooseModule, ProductsImportService],
})
export class ProductsModule {}
