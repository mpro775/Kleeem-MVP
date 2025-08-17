// src/modules/workflow-history/workflow-history.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  WorkflowHistory,
  WorkflowHistorySchema,
} from './schemas/workflow-history.schema';
import { WorkflowHistoryService } from './workflow-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowHistory.name, schema: WorkflowHistorySchema },
    ]),
  ],
  providers: [WorkflowHistoryService],
  exports: [WorkflowHistoryService],
})
export class WorkflowHistoryModule {}
