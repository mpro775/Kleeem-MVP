// src/modules/products/products.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

import { ScraperModule } from '../scraper/scraper.module';
import { VectorModule } from '../vector/vector.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ProductSetupConfigService } from './product-setup-config.service';
import {
  ProductSetupConfig,
  ProductSetupConfigSchema,
} from './schemas/product-setup-config.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  Storefront,
  StorefrontSchema,
} from '../storefront/schemas/storefront.schema';
import { ZidModule } from '../integrations/zid/zid.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { MulterModule } from '@nestjs/platform-express';
import * as Minio from 'minio';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsCron } from './products.cron';
import { ErrorManagementModule } from '../../common/error-management.module';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }),
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductSetupConfig.name, schema: ProductSetupConfigSchema }, // ← أضف هذا
      { name: Category.name, schema: CategorySchema }, // أضف هذا السطر!
      { name: Storefront.name, schema: StorefrontSchema }, // أضف هذا السطر!
    ]),
    forwardRef(() => ScraperModule),
    BullModule.registerQueue({ name: 'scrape' }),
    forwardRef(() => VectorModule), // ← حوّل هنا إلى forwardRef
    forwardRef(() => AnalyticsModule),
    forwardRef(() => ZidModule),
    forwardRef(() => StorefrontModule),
    ErrorManagementModule, // إضافة وحدة إدارة الأخطاء
  ],
  providers: [
    ProductsService,
    ProductSetupConfigService,
    ProductsCron,
    {
      provide: 'MINIO_CLIENT',
      useFactory: () => {
        return new Minio.Client({
          endPoint: process.env.MINIO_ENDPOINT || 'localhost',
          port: parseInt(process.env.MINIO_PORT || '9000'),
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
      },
    },
  ],
  controllers: [ProductsController],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
