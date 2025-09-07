// src/common/decorators/allow-unverified.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const AllowUnverifiedEmail = () =>
  SetMetadata('allowUnverifiedEmail', true);
