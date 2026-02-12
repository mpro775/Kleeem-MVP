// src/common/guards/customer.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import type { CustomerRequestUser } from '../../modules/auth/strategies/customer-jwt.strategy';

export interface RequestWithCustomer extends Request {
  customer: CustomerRequestUser;
}

@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithCustomer>();
    const customer = request.customer;

    if (!customer?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }

    // التأكد من أن الطلب يحتوي على merchantId صحيح
    const rawMerchantId =
      request.params.merchantId ??
      (request.body as { merchantId?: string } | undefined)?.merchantId ??
      (request.query as { merchantId?: string } | undefined)?.merchantId;
    const merchantId =
      typeof rawMerchantId === 'string' ? rawMerchantId : undefined;
    if (merchantId && merchantId !== customer.merchantId) {
      throw new UnauthorizedException('Invalid merchant access');
    }

    return true;
  }
}
