// src/common/errors/domain-error.ts
import { HttpException, HttpStatus } from '@nestjs/common';

/** DomainError: استخدمه داخل الخدمات/اليوزكيس لرمي أخطاء أعمال بكود واضح */
export class DomainError extends HttpException {
  constructor(
    code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: any
  ) {
    super({ code, message, details }, status);
  }
}

// أمثلة سريعة
export class OutOfStockErrorExample extends DomainError {
  constructor(productId: string) {
    super('OUT_OF_STOCK', 'المنتج غير متوفر حاليًا', HttpStatus.CONFLICT, { productId });
  }
}
