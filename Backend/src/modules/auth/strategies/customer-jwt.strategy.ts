// src/modules/auth/strategies/customer-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CustomersService } from '../../customers/customers.service';

import type { Customer } from '../../customers/schemas/customer.schema';

export interface CustomerJwtPayload {
  customerId: string;
  merchantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface CustomerRequestUser {
  customerId: string;
  merchantId: string;
  role: string;
  customer?: Customer;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor(
    private config: ConfigService,
    private customersService: CustomersService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CustomerRequestUser> {
    const { customerId, merchantId, role } = payload;

    if (role !== 'CUSTOMER') {
      throw new UnauthorizedException('Invalid token for customer access');
    }

    // التحقق من وجود العميل
    const customer = await this.customersService.findByIdAndMerchant(
      customerId,
      merchantId,
    );
    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    // التحقق من عدم حظر العميل
    if (customer.isBlocked) {
      throw new UnauthorizedException('Customer account is blocked');
    }

    return {
      customerId,
      merchantId,
      role,
      customer,
    };
  }
}
