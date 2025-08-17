import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
  ) {}

  async create(merchantId: string, dto: CreateLeadDto): Promise<Lead> {
    const created = await this.leadModel.create({
      merchantId,
      sessionId: dto.sessionId,
      data: dto.data,
      source: dto.source,
    });
    return created.toObject();
  }

  async findAllForMerchant(merchantId: string): Promise<Lead[]> {
    return this.leadModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
  }
}
