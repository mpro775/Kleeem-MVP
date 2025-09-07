import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadsService } from './leads.service';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadsController } from './leads.controller';
import { StorefrontLeadsController } from './storefront-leads.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
  ],
  providers: [LeadsService],
  controllers: [LeadsController, StorefrontLeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
