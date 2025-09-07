// src/common/decorators/skip-merchant-check.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const SkipMerchantCheck = () => SetMetadata('skipMerchantCheck', true);
