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
import { IntegrationsModule } from '../integrations/integrations.module';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { StorefrontModule } from '../storefront/storefront.module';
import { InstructionsModule } from '../instructions/instructions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema }, // ← هنا
      { name: Category.name, schema: CategorySchema },
    ]),
    StorefrontModule,
    forwardRef(() => AuthModule),
    MulterModule.register({ dest: './uploads' }),
    forwardRef(() => InstructionsModule),
    HttpModule,
    forwardRef(() => N8nWorkflowModule),
    IntegrationsModule,
  ],
  providers: [
    MerchantsService,
    PromptBuilderService,
    PromptVersionService,
    PromptPreviewService,
    MerchantChecklistService,
  ],
  controllers: [MerchantsController, MerchantPromptController],
  exports: [
    MerchantsService,
    PromptVersionService,
    PromptPreviewService,
    PromptBuilderService,
    MerchantChecklistService,
  ],
})
export class MerchantsModule {}
