// src/modules/public/public.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PublicRouterController } from './public-router.controller';
import { SlugResolverService } from './slug-resolver.service';

// انتبه لمسارات السكيمات الفعلية في مشروعك:
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { Channel, ChannelSchema } from '../channels/schemas/channel.schema';
import { Storefront, StorefrontSchema } from '../storefront/schemas/storefront.schema';
import { ChatWidgetSettings, ChatWidgetSettingsSchema } from '../chat/schema/chat-widget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Storefront.name, schema: StorefrontSchema },
      { name: ChatWidgetSettings.name, schema: ChatWidgetSettingsSchema },
    ]),
  ],
  controllers: [PublicRouterController],
  providers: [SlugResolverService],
  exports: [SlugResolverService],
})
export class PublicModule {}
