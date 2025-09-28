// src/modules/n8n-workflow/n8n-workflow.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MerchantsModule } from '../merchants/merchants.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { WorkflowHistoryModule } from '../workflow-history/workflow-history.module';

import { N8nForwarderService } from './n8n-forwarder.service';
import { N8nWorkflowController } from './n8n-workflow.controller';
import { N8nWorkflowService } from './n8n-workflow.service';
import { N8nAxiosRepository } from './repositories/n8n-axios.repository';
import { N8N_CLIENT } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    WorkflowHistoryModule, // ليكون WorkflowHistoryService متاحًا
    forwardRef(() => MerchantsModule), // ليكون MerchantsService متاحًا
  ],
  providers: [
    N8nForwarderService,
    N8nWorkflowService,
    { provide: N8N_CLIENT, useClass: N8nAxiosRepository },
  ],
  exports: [N8nWorkflowService, N8nForwarderService],
  controllers: [N8nWorkflowController],
})
export class N8nWorkflowModule {}
