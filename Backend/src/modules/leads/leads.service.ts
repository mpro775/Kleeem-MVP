import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
function normalizePhone(p?: string) {
  if (!p) return undefined;
  const digits = p.replace(/\D+/g, '');
  // إن أردت تضيف كود بلد افتراضي:
  // return digits.startsWith('0') ? '966' + digits.slice(1) : digits;
  return digits;
}
@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
  ) {}

  async create(merchantId: string, dto: CreateLeadDto): Promise<Lead> {
    const phone =
      dto.data?.phone ??
      dto.data?.mobile ??
      dto.data?.phoneNumber ??
      dto.data?.whatsapp;
  
    const name = dto.data?.name ?? dto.data?.fullName ?? dto.data?.customerName;
  
    const created = await this.leadModel.create({
      merchantId,
      sessionId: dto.sessionId,
      data: dto.data,
      source: dto.source,
      phoneNormalized: normalizePhone(phone), // ← جديد
      name,                                   // ← اختياري للعرض
    });
    return created.toObject();
  }
  async findAllForMerchant(merchantId: string): Promise<Lead[]> {
    return this.leadModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
  }
  async getPhoneBySession(merchantId: string, sessionId: string): Promise<string | undefined> {
    const doc = await this.leadModel
      .findOne({ merchantId, sessionId, phoneNormalized: { $exists: true, $ne: null } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    return doc?.phoneNormalized;
  }
}
