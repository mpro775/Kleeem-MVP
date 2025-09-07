// src/common/exceptions/payment-required.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(message = 'Usage limit exceeded. Please upgrade your plan.') {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
