// src/modules/instructions/instructions.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Instruction, InstructionSchema } from './schemas/instruction.schema';
import { InstructionsService } from './instructions.service';
import { InstructionsController } from './instructions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instruction.name, schema: InstructionSchema },
    ]),
  ],
  providers: [InstructionsService],
  controllers: [InstructionsController],
  exports: [InstructionsService],
})
export class InstructionsModule {}
