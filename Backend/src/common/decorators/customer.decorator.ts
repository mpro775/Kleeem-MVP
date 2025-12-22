// src/common/decorators/customer.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CustomerRequestUser } from '../../modules/auth/strategies/customer-jwt.strategy';

export const Customer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CustomerRequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.customer;
  },
);
