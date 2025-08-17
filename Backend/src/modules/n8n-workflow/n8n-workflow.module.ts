// src/modules/n8n-workflow/n8n-workflow.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { N8nWorkflowService } from './n8n-workflow.service';
import { WorkflowHistoryModule } from '../workflow-history/workflow-history.module';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    WorkflowHistoryModule, // ليكون WorkflowHistoryService متاحًا
    forwardRef(() => MerchantsModule), // ليكون MerchantsService متاحًا
  ],
  providers: [N8nWorkflowService],
  exports: [N8nWorkflowService],
})
export class N8nWorkflowModule {}
