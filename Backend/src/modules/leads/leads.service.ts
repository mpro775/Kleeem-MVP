import { Injectable, Inject } from '@nestjs/common';
import { Lead } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LEAD_REPOSITORY } from './tokens';
import { LeadRepository } from './repositories/lead.repository';

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
    @Inject(LEAD_REPOSITORY)
    private readonly leadsRepo: LeadRepository,
  ) {}

  async create(merchantId: string, dto: CreateLeadDto): Promise<Lead> {
    const phone =
      dto.data?.phone ??
      dto.data?.mobile ??
      dto.data?.phoneNumber ??
      dto.data?.whatsapp;

    const name = dto.data?.name ?? dto.data?.fullName ?? dto.data?.customerName;

    const created = await this.leadsRepo.create({
      merchantId,
      sessionId: dto.sessionId,
      data: dto.data,
      source: dto.source,
      phoneNormalized: normalizePhone(phone),
      name,
    });

    return created as Lead;
  }

  async findAllForMerchant(merchantId: string): Promise<Lead[]> {
    const out = await this.leadsRepo.findAllForMerchant(merchantId);
    return out as Lead[];
  }

  async getPhoneBySession(
    merchantId: string,
    sessionId: string,
  ): Promise<string | undefined> {
    return this.leadsRepo.getPhoneBySession(merchantId, sessionId);
  }
}
