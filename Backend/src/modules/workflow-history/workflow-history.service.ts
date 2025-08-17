import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkflowHistory } from './schemas/workflow-history.schema';

@Injectable()
export class WorkflowHistoryService {
  constructor(
    @InjectModel(WorkflowHistory.name)
    private readonly workflowHistoryModel: Model<WorkflowHistory>,
  ) {}

  // إضافة نسخة جديدة
  async create(historyData: Partial<WorkflowHistory>) {
    return this.workflowHistoryModel.create(historyData);
  }

  // جلب كل النسخ لتاجر أو ورك فلو
  async findAllByWorkflow(workflowId: string) {
    return this.workflowHistoryModel
      .find({ workflowId })
      .sort({ version: -1 })
      .lean();
  }

  // جلب نسخة محددة
  async findVersion(workflowId: string, version: number) {
    return this.workflowHistoryModel.findOne({ workflowId, version }).lean();
  }
}
