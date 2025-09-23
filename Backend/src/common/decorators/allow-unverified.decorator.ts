// src/common/decorators/allow-unverified.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const AllowUnverifiedEmail = (): ReturnType<typeof SetMetadata> =>
  SetMetadata('allowUnverifiedEmail', true);
