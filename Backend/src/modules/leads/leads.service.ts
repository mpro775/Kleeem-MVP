import { Injectable, Inject } from '@nestjs/common';

import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadRepository } from './repositories/lead.repository';
import { Lead } from './schemas/lead.schema';
import { LEAD_REPOSITORY } from './tokens';

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

  private extractPhone(dto: CreateLeadDto): string | undefined {
    return (
      (dto.data?.phone as string) ??
      (dto.data?.mobile as string) ??
      (dto.data?.phoneNumber as string) ??
      (dto.data?.whatsapp as string)
    );
  }

  private extractName(dto: CreateLeadDto): string | undefined {
    return (
      (dto.data?.name as string) ??
      (dto.data?.fullName as string) ??
      (dto.data?.customerName as string)
    );
  }

  async create(merchantId: string, dto: CreateLeadDto): Promise<Lead> {
    const phone = this.extractPhone(dto);
    const name = this.extractName(dto);

    const phoneNormalized = normalizePhone(phone);
    const created = await this.leadsRepo.create({
      merchantId,
      sessionId: dto.sessionId!,
      data: dto.data!,
      ...(dto.source && { source: dto.source }),
      ...(phoneNormalized && { phoneNormalized }),
      ...(name && { name }),
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
