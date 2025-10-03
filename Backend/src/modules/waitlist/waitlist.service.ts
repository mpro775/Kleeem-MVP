// src/waitlist/waitlist.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MS_PER_SECOND } from 'src/common/constants/common';

import { CreateWaitlistLeadDto } from './dto/create-waitlist-lead.dto';
import { WaitlistLead } from './schemas/waitlist-lead.schema';

const ONE_DAY_MS = 24 * 60 * 60 * MS_PER_SECOND;

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(WaitlistLead.name) private model: Model<WaitlistLead>,
  ) {}

  async create(
    dto: CreateWaitlistLeadDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ id: string; createdAt: Date }> {
    if (dto.company && dto.company.trim().length > 0) {
      throw new BadRequestException('Rejected');
    }

    const since = new Date(Date.now() - ONE_DAY_MS);
    const dup = await this.model
      .findOne({ email: dto.email.toLowerCase(), createdAt: { $gte: since } })
      .lean();
    if (dup) throw new ConflictException('Duplicate');

    const created = await this.model.create({
      ...dto,
      email: dto.email.toLowerCase(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { id: String(created._id), createdAt: created.createdAt };
  }
}
