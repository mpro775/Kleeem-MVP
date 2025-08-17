import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExtractService } from './extract.service';

@Module({
  imports: [HttpModule.register({ timeout: 30_000 })],
  providers: [ExtractService],
  exports: [ExtractService],
})
export class ExtractModule {}
