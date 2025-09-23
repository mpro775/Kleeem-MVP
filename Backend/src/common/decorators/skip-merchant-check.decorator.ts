// src/common/decorators/skip-merchant-check.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const SkipMerchantCheck = (): ReturnType<typeof SetMetadata> =>
  SetMetadata('skipMerchantCheck', true);
