import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LeadsService } from './leads.service';
import { LeadMongoRepository } from './repositories/lead.mongo.repository';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LEAD_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
  ],
  providers: [
    LeadsService,
    { provide: LEAD_REPOSITORY, useClass: LeadMongoRepository },
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
