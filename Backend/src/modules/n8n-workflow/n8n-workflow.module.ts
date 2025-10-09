import { Module, forwardRef, type ModuleMetadata } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MerchantsModule } from '../merchants/merchants.module';
import { Merchant } from '../merchants/schemas/merchant.schema';
import { MerchantSchema } from '../merchants/schemas/merchant.schema';
import { WorkflowHistoryModule } from '../workflow-history/workflow-history.module';
// ... rest of imports

import { N8nForwarderService } from './n8n-forwarder.service';
import { N8nWorkflowController } from './n8n-workflow.controller';
import { N8nWorkflowService } from './n8n-workflow.service';
import { N8nAxiosRepository } from './repositories/n8n-axios.repository';
import { N8N_CLIENT } from './tokens';
const metadata = {
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    WorkflowHistoryModule,
    forwardRef(() => MerchantsModule),
  ],
  providers: [
    N8nForwarderService,
    N8nWorkflowService,
    { provide: N8N_CLIENT, useClass: N8nAxiosRepository },
  ],
  exports: [N8nWorkflowService, N8nForwarderService],
  controllers: [N8nWorkflowController],
} satisfies ModuleMetadata;

@Module(metadata)
export class N8nWorkflowModule {}
