// src/common/decorators/customer.decorator.ts
import { createParamDecorator } from '@nestjs/common';

import type { CustomerRequestUser } from '../../modules/auth/strategies/customer-jwt.strategy';
import type { RequestWithCustomer } from '../guards/customer.guard';
import type { ExecutionContext } from '@nestjs/common';

export const Customer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CustomerRequestUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithCustomer>();
    return request.customer;
  },
);
