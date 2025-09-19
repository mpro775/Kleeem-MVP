import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PLAN_REPOSITORY } from './tokens';
import { PlanMongoRepository } from './repositories/plan.mongo.repository';

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
