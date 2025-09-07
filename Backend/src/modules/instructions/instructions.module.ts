// src/modules/instructions/instructions.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Instruction, InstructionSchema } from './schemas/instruction.schema';
import { InstructionsService } from './instructions.service';
import { InstructionsController } from './instructions.controller';
import { AiModule } from '../ai/ai.module';
import { MessagingModule } from '../messaging/message.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instruction.name, schema: InstructionSchema },
    ]),
    forwardRef(() => MessagingModule),
    forwardRef(() => AiModule),
  ],
  providers: [InstructionsService],
  controllers: [InstructionsController],
  exports: [InstructionsService],
})
export class InstructionsModule {}
