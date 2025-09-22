// src/modules/ai/ai.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstructionsModule } from 'src/modules/instructions/instructions.module';

import { GeminiService } from './gemini.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    forwardRef(() => InstructionsModule),
  ],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
