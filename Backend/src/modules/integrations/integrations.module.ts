import { HttpModule } from '@nestjs/axios'; // <-- أضف هذا السطر
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// import { IntegrationsService } from './integrations.service';
import { MerchantsModule } from '../merchants/merchants.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';

import { EvolutionService } from './evolution.service';
import { IntegrationsController } from './integrations.controller';
import { SallaModule } from './salla/salla.module';
import { Integration, IntegrationSchema } from './schemas/integration.schema';
import { ZidModule } from './zid/zid.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Integration.name, schema: IntegrationSchema },
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    forwardRef(() => MerchantsModule),
    HttpModule, // <-- وهذا هنا
    SallaModule,
    ZidModule,
  ],
  providers: [EvolutionService],
  controllers: [IntegrationsController],
  exports: [EvolutionService, SallaModule, ZidModule],
})
export class IntegrationsModule {}
