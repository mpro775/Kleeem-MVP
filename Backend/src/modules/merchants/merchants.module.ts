// src/modules/merchants/merchants.module.ts

import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { OutboxModule } from '../../common/outbox/outbox.module';
import { CommonServicesModule } from '../../common/services/common-services.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { Channel, ChannelSchema } from '../channels/schemas/channel.schema';
import { ChatModule } from '../chat/chat.module';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsSchema,
} from '../chat/schema/chat-widget.schema';
import { InstructionsModule } from '../instructions/instructions.module';
import { N8nWorkflowModule } from '../n8n-workflow/n8n-workflow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PublicRouterController } from '../public/public-router.controller';
import { SlugResolverService } from '../public/slug-resolver.service';
import {
  Storefront,
  StorefrontSchema,
} from '../storefront/schemas/storefront.schema';
import { StorefrontModule } from '../storefront/storefront.module';
import { User, UserSchema } from '../users/schemas/user.schema';

import { CleanupCoordinatorService } from './cleanup-coordinator.service';
import { MerchantPromptController } from './controllers/merchant-prompt.controller';
import { MerchantChecklistService } from './merchant-checklist.service';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { MongoMerchantChecklistRepository } from './repositories/mongo-merchant-checklist.repository';
import { MongoMerchantsRepository } from './repositories/mongo-merchants.repository';
import { MongoPromptVersionRepository } from './repositories/mongo-prompt-version.repository';
import { Merchant, MerchantSchema } from './schemas/merchant.schema';
import { MerchantCacheService } from './services/merchant-cache.service';
import { MerchantDeletionService } from './services/merchant-deletion.service';
import { MerchantProfileService } from './services/merchant-profile.service';
import { MerchantPromptService } from './services/merchant-prompt.service';
import { MerchantProvisioningService } from './services/merchant-provisioning.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { PromptPreviewService } from './services/prompt-preview.service';
import { PromptVersionService } from './services/prompt-version.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: ChatWidgetSettings.name, schema: ChatWidgetSettingsSchema },
      { name: Storefront.name, schema: StorefrontSchema },
    ]),
    StorefrontModule,
    forwardRef(() => AuthModule),
    MulterModule.register({ dest: './uploads' }),
    forwardRef(() => InstructionsModule),
    HttpModule,
    forwardRef(() => N8nWorkflowModule),
    MetricsModule,
    NotificationsModule,
    CatalogModule,
    forwardRef(() => ChatModule),
    OutboxModule,
    CommonServicesModule,
  ],
  providers: [
    MerchantsService,
    PromptBuilderService,

    {
      provide: 'MerchantsRepository',
      useClass: MongoMerchantsRepository,
    },
    {
      provide: 'MerchantChecklistRepository',
      useClass: MongoMerchantChecklistRepository,
    },
    {
      provide: 'PromptVersionRepository',
      useClass: MongoPromptVersionRepository,
    },
    PromptVersionService,
    PromptPreviewService,
    CleanupCoordinatorService,
    MerchantChecklistService,
    SlugResolverService,
    MerchantProvisioningService,
    MerchantCacheService,
    MerchantPromptService,
    MerchantProfileService,
    MerchantDeletionService,
  ],
  controllers: [
    MerchantsController,
    MerchantPromptController,
    PublicRouterController,
  ],
  exports: [
    // Services
    MerchantsService,
    PromptVersionService,
    PromptPreviewService,
    PromptBuilderService,
    MerchantChecklistService,
    SlugResolverService,
    CleanupCoordinatorService,
    MerchantProvisioningService,
    MerchantCacheService,
    MerchantPromptService,
    MerchantProfileService,
    MerchantDeletionService,

    // Repositories
    'MerchantsRepository',
    'MerchantChecklistRepository',
    'PromptVersionRepository',

    // Mongoose Models (if needed by other modules)
    MongooseModule,
  ],
})
export class MerchantsModule {}
