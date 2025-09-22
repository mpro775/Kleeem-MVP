import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExtractService } from './extract.service';

@Module({
  imports: [HttpModule.register({ timeout: 30_000 })],
  providers: [ExtractService],
  exports: [ExtractService],
})
export class ExtractModule {}
