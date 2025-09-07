// src/modules/merchants/merchants.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Merchant, MerchantSchema } from './schemas/merchant.schema';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { HttpModule } from '@nestjs/axios';
import { N8nWorkflowModule } from '../n8n-workflow/n8n-workflow.module';
import { AuthModule } from '../auth/auth.module';
import { MulterModule } from '@nestjs/platform-express';
import { PromptBuilderService } from './services/prompt-builder.service';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptPreviewService } from './services/prompt-preview.service';
import { MerchantPromptController } from './controllers/merchant-prompt.controller';
import { MerchantChecklistService } from './merchant-checklist.service';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { StorefrontModule } from '../storefront/storefront.module';
import { InstructionsModule } from '../instructions/instructions.module';
import { MetricsModule } from 'src/metrics/metrics.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Channel, ChannelSchema } from '../channels/schemas/channel.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OutboxModule } from '../../common/outbox/outbox.module';
import { SlugResolverService } from '../public/slug-resolver.service';
import { PublicRouterController } from '../public/public-router.controller';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsSchema,
} from '../chat/schema/chat-widget.schema';
import {
  Storefront,
  StorefrontSchema,
} from '../storefront/schemas/storefront.schema';
import { ChatModule } from '../chat/chat.module';
import { CleanupCoordinatorService } from './cleanup-coordinator.service';

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
  ],
  providers: [
    MerchantsService,
    PromptBuilderService,
    PromptVersionService,
    PromptPreviewService,
    CleanupCoordinatorService,
    MerchantChecklistService,
    SlugResolverService,
  ],
  controllers: [
    MerchantsController,
    MerchantPromptController,
    PublicRouterController,
  ],
  exports: [
    MerchantsService,
    PromptVersionService,
    PromptPreviewService,
    PromptBuilderService,
    MerchantChecklistService,
    SlugResolverService,
  ],
})
export class MerchantsModule {}
