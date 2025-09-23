import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExtractService } from './extract.service';
const DEFAULT_TIMEOUT = 30_000;
@Module({
  imports: [HttpModule.register({ timeout: DEFAULT_TIMEOUT })],
  providers: [ExtractService],
  exports: [ExtractService],
})
export class ExtractModule {}
