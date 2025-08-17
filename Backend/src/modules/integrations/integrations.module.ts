import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios'; // <-- أضف هذا السطر
// import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { Integration, IntegrationSchema } from './schemas/integration.schema';
import { MerchantsModule } from '../merchants/merchants.module';
import { EvolutionService } from './evolution.service';
import { SallaModule } from './salla/salla.module';
import { ZidModule } from './zid/zid.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';

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
