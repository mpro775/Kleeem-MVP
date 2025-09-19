// src/modules/products/products.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import * as Minio from 'minio';

import { Product, ProductSchema } from './schemas/product.schema';
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

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductSetupConfigService } from './product-setup-config.service';

// 🆕 Repository
import { MongoProductsRepository } from './repositories/mongo-products.repository';

// خدمات مساعدة
import { ProductIndexService } from './services/product-index.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductCommandsService } from './services/product-commands.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductQueriesService } from './services/product-queries.service';
import { ProductPublicService } from './services/product-public.service';

// وحدات مرتبطة
import { ScraperModule } from '../scraper/scraper.module';
import { VectorModule } from '../vector/vector.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ZidModule } from '../integrations/zid/zid.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { CategoriesModule } from '../categories/categories.module';

import { ScheduleModule } from '@nestjs/schedule';
import { ProductsCron } from './utils/products.cron';

import { ErrorManagementModule } from '../../common/error-management.module';
import { CacheModule } from '../../common/cache/cache.module';
import { CommonServicesModule } from '../../common/services/common-services.module';
import { OutboxModule } from '../../common/outbox/outbox.module';

@Module({
  imports: [
    // ملاحظة: يفضّل وضع ScheduleModule.forRoot() مرة واحدة في AppModule.
    ScheduleModule.forRoot(),
    MulterModule.register({ dest: './uploads' }),

    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductSetupConfig.name, schema: ProductSetupConfigSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Storefront.name, schema: StorefrontSchema },
    ]),

    // Using forwardRef to resolve circular dependencies
    forwardRef(() => VectorModule),
    forwardRef(() => ScraperModule),
    AnalyticsModule,
    forwardRef(() => ZidModule),
    forwardRef(() => StorefrontModule),
    CategoriesModule,
    OutboxModule,
    BullModule.registerQueue({ name: 'scrape' }),
    ErrorManagementModule,
    CacheModule,
    CommonServicesModule,
  ],
  controllers: [ProductsController],
  providers: [
    // Service رشيقة (تستدعي repo/media/index)
    ProductsService,

    // Repository binding
    { provide: 'ProductsRepository', useClass: MongoProductsRepository },

    // Helpers
    ProductIndexService,
    ProductMediaService,
    ProductsCron,
    ProductCommandsService,
    ProductSyncService,
    ProductQueriesService,
    ProductPublicService,

    // Product setup configuration service
    ProductSetupConfigService,

    // MinIO client
    {
      provide: 'MINIO_CLIENT',
      useFactory: () => {
        return new Minio.Client({
          endPoint: process.env.MINIO_ENDPOINT || 'localhost',
          port: parseInt(process.env.MINIO_PORT || '9000', 10),
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
      },
    },
  ],
  exports: [
    ProductsService,
    ProductCommandsService,
    ProductSyncService,
    ProductQueriesService,
    ProductPublicService,
    // إن احتجت المستودع خارج الموديول (نادراً)
    'ProductsRepository',
    MongooseModule,
  ],
})
export class ProductsModule {}
