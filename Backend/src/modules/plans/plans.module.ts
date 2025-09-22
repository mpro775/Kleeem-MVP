import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlanMongoRepository } from './repositories/plan.mongo.repository';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { PLAN_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
  ],
  providers: [
    PlansService,
    { provide: PLAN_REPOSITORY, useClass: PlanMongoRepository },
  ],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
