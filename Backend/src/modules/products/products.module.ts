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
import {
  Storefront,
  StorefrontSchema,
} from '../storefront/schemas/storefront.schema';
import { StorefrontModule } from '../storefront/storefront.module';
import { VectorModule } from '../vector/vector.module';

import { ProductSetupConfigService } from './product-setup-config.service';
import { ProductsController } from './products.controller';
import { AttributeDefinitionsController } from './controllers/attribute-definitions.controller';
import { ProductsService } from './products.service';
import { MongoProductsRepository } from './repositories/mongo-products.repository';
import { MongoAttributeDefinitionsRepository } from './repositories/mongo-attribute-definitions.repository';
import { AttributeDefinitionsRepository } from './repositories/attribute-definitions.repository';
import { AttributeDefinitionsService } from './services/attribute-definitions.service';
import {
  ProductSetupConfig,
  ProductSetupConfigSchema,
} from './schemas/product-setup-config.schema';
import {
  AttributeDefinition,
  AttributeDefinitionSchema,
} from './schemas/attribute-definition.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductCommandsService } from './services/product-commands.service';
import { ProductCsvService } from './services/product-csv.service';
import { ProductIndexService } from './services/product-index.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductPublicService } from './services/product-public.service';
import { ProductQueriesService } from './services/product-queries.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductValidationService } from './services/product-validation.service';
import { InventoryService } from './services/inventory.service';
import { ProductsCron } from './utils/products.cron';

@Module({
  imports: [
    // ملاحظة: يفضّل وضع ScheduleModule.forRoot() مرة واحدة في AppModule.
    ScheduleModule.forRoot(),
    MulterModule.register({ dest: './uploads' }),

    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductSetupConfig.name, schema: ProductSetupConfigSchema },
      { name: AttributeDefinition.name, schema: AttributeDefinitionSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Storefront.name, schema: StorefrontSchema },
    ]),

    // Using forwardRef to resolve circular dependencies
    forwardRef(() => VectorModule),
    AnalyticsModule,
    forwardRef(() => ZidModule),
    forwardRef(() => StorefrontModule),
    CategoriesModule,
    OutboxModule,
    ErrorManagementModule,
    CacheModule,
    CommonServicesModule,
    MetricsModule,
    StorageModule,
  ],
  controllers: [ProductsController, AttributeDefinitionsController],
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

    // Helpers
    ProductIndexService,
    ProductMediaService,
    ProductsCron,
    ProductCommandsService,
    ProductSyncService,
    ProductQueriesService,
    ProductPublicService,
    ProductValidationService,
    ProductCsvService,
    InventoryService,

    // Product setup configuration service
    ProductSetupConfigService,
  ],
  exports: [
    ProductsService,
    ProductCommandsService,
    ProductSyncService,
    ProductQueriesService,
    ProductPublicService,
    InventoryService,
    AttributeDefinitionsService,
    // إن احتجت المستودع خارج الموديول (نادراً)
    'ProductsRepository',
    AttributeDefinitionsRepository,
    MongooseModule,
  ],
})
export class ProductsModule {}
