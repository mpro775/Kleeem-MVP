// src/modules/ai/ai.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { InstructionsModule } from 'src/modules/instructions/instructions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    forwardRef(() => InstructionsModule),
  ],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
