// src/modules/products/products.module.ts
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import * as Minio from 'minio';

import { CacheModule } from '../../common/cache/cache.module';
import { ErrorManagementModule } from '../../common/error-management.module';
import { OutboxModule } from '../../common/outbox/outbox.module';
import { CommonServicesModule } from '../../common/services/common-services.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CategoriesModule } from '../categories/categories.module';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { ZidModule } from '../integrations/zid/zid.module';
import { ScraperModule } from '../scraper/scraper.module';
import {
  Storefront,
  StorefrontSchema,
} from '../storefront/schemas/storefront.schema';
import { StorefrontModule } from '../storefront/storefront.module';
import { VectorModule } from '../vector/vector.module';

import { ProductSetupConfigService } from './product-setup-config.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { MongoProductsRepository } from './repositories/mongo-products.repository';
import {
  ProductSetupConfig,
  ProductSetupConfigSchema,
} from './schemas/product-setup-config.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductCommandsService } from './services/product-commands.service';
import { ProductIndexService } from './services/product-index.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductPublicService } from './services/product-public.service';
import { ProductQueriesService } from './services/product-queries.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductsCron } from './utils/products.cron';

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
    MetricsModule,
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
