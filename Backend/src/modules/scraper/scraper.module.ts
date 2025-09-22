// src/modules/scraper/scraper.module.ts
import { HttpModule } from '@nestjs/axios'; // ← استيراد هذا
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';

import { ProductsModule } from '../products/products.module';
import { VectorModule } from '../vector/vector.module';

import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [
    HttpModule, // ← أضف هنا
    BullModule.registerQueue({ name: 'scrape' }),
    forwardRef(() => ProductsModule),
    forwardRef(() => VectorModule),
  ],
  providers: [ScraperService],
  controllers: [ScraperController],
  exports: [ScraperService],
})
export class ScraperModule {}
