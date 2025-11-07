import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsISO8601,
  IsEnum,
  IsString,
} from 'class-validator';

export enum OfferType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
  QUANTITY_BASED = 'quantity_based',
}

export class OfferDto {
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  // للنوع البسيط (percentage/fixed_amount)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  discountValue?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  oldPrice?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  newPrice?: number;

  // للكمية (quantity_based)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  quantityThreshold?: number; // اشتري 3

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  quantityDiscount?: number; // خذ 20%

  // Buy X Get Y
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  buyQuantity?: number; // اشتري 2

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  getQuantity?: number; // خذ 1

  @IsOptional()
  @IsString()
  getProductId?: string; // منتج آخر أو null لنفس المنتج

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  getDiscount?: number; // خصم على المنتج المجاني (100% = مجاني)

  // الفترة الزمنية
  @IsOptional()
  @IsISO8601()
  startAt?: string; // ISO string

  @IsOptional()
  @IsISO8601()
  endAt?: string; // ISO string
}
