// src/modules/products/products.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';

import { CacheModule } from '../../common/cache/cache.module';
import { ErrorManagementModule } from '../../common/error-management.module';
import { OutboxModule } from '../../common/outbox/outbox.module';
import { CommonServicesModule } from '../../common/services/common-services.module';
import { StorageModule } from '../../common/storage/storage.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CategoriesModule } from '../categories/categories.module';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { ZidModule } from '../integrations/zid/zid.module';
import { MailModule } from '../mail/mail.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import {
  Storefront,
  StorefrontSchema,
} from '../storefront/schemas/storefront.schema';
import { StorefrontModule } from '../storefront/storefront.module';
import { VectorModule } from '../vector/vector.module';

import { AttributeDefinitionsController } from './controllers/attribute-definitions.controller';
import { BackInStockController } from './controllers/back-in-stock.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { ProductSetupConfigService } from './product-setup-config.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AttributeDefinitionsRepository } from './repositories/attribute-definitions.repository';
import { BackInStockRequestMongoRepository } from './repositories/back-in-stock-request.mongo.repository';
import { MongoAttributeDefinitionsRepository } from './repositories/mongo-attribute-definitions.repository';
import { MongoProductsRepository } from './repositories/mongo-products.repository';
import { ProductReviewMongoRepository } from './repositories/product-review.mongo.repository';
import {
  AttributeDefinition,
  AttributeDefinitionSchema,
} from './schemas/attribute-definition.schema';
import {
  BackInStockRequest,
  BackInStockRequestSchema,
} from './schemas/back-in-stock-request.schema';
import {
  ProductReview,
  ProductReviewSchema,
} from './schemas/product-review.schema';
import {
  ProductSetupConfig,
  ProductSetupConfigSchema,
} from './schemas/product-setup-config.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  StockChangeLog,
  StockChangeLogSchema,
} from './schemas/stock-change-log.schema';
import { AttributeDefinitionsService } from './services/attribute-definitions.service';
import { BackInStockService } from './services/back-in-stock.service';
import { InventoryService } from './services/inventory.service';
import { PriceSyncService } from './services/price-sync.service';
import { ProductCommandsService } from './services/product-commands.service';
import { ProductCsvService } from './services/product-csv.service';
import { ProductIndexService } from './services/product-index.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductPublicService } from './services/product-public.service';
import { ProductQueriesService } from './services/product-queries.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductValidationService } from './services/product-validation.service';
import { ReviewsService } from './services/reviews.service';
import { StockChangeLogService } from './services/stock-change-log.service';
import {
  BACK_IN_STOCK_REQUEST_REPOSITORY,
  PRODUCT_REVIEW_REPOSITORY,
} from './tokens';
import { ProductsCron } from './utils/products.cron';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }),

    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductSetupConfig.name, schema: ProductSetupConfigSchema },
      { name: AttributeDefinition.name, schema: AttributeDefinitionSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Storefront.name, schema: StorefrontSchema },
      { name: BackInStockRequest.name, schema: BackInStockRequestSchema },
      { name: ProductReview.name, schema: ProductReviewSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: StockChangeLog.name, schema: StockChangeLogSchema },
    ]),

    // Using forwardRef to resolve circular dependencies
    forwardRef(() => VectorModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => ZidModule),
    forwardRef(() => StorefrontModule),
    forwardRef(() => MerchantsModule),
    forwardRef(() => CommonServicesModule),
    CategoriesModule,
    MailModule,
    OutboxModule,
    ErrorManagementModule,
    CacheModule,
    MetricsModule,
    StorageModule,
  ],
  controllers: [
    ProductsController,
    AttributeDefinitionsController,
    BackInStockController,
    ReviewsController,
  ],
  providers: [
    // Service رشيقة (تستدعي repo/media/index)
    ProductsService,
    AttributeDefinitionsService,

    // Repository binding
    { provide: 'ProductsRepository', useClass: MongoProductsRepository },
    {
      provide: AttributeDefinitionsRepository,
      useClass: MongoAttributeDefinitionsRepository,
    },
    {
      provide: BACK_IN_STOCK_REQUEST_REPOSITORY,
      useClass: BackInStockRequestMongoRepository,
    },
    {
      provide: PRODUCT_REVIEW_REPOSITORY,
      useClass: ProductReviewMongoRepository,
    },

    // Helpers
    ProductIndexService,
    ProductMediaService,
    ProductsCron,
    ProductCommandsService,
    ProductSyncService,
    PriceSyncService,
    ProductQueriesService,
    ProductPublicService,
    ProductValidationService,
    ProductCsvService,
    InventoryService,
    StockChangeLogService,
    BackInStockService,
    ReviewsService,

    // Product setup configuration service
    ProductSetupConfigService,
  ],
  exports: [
    ProductsService,
    ProductCommandsService,
    ProductSyncService,
    PriceSyncService,
    ProductQueriesService,
    ProductPublicService,
    InventoryService,
    StockChangeLogService,
    AttributeDefinitionsService,
    BackInStockService,
    ReviewsService,
    // إن احتجت المستودع خارج الموديول (نادراً)
    'ProductsRepository',
    AttributeDefinitionsRepository,
    MongooseModule,
  ],
})
export class ProductsModule {}
