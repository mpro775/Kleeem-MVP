import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum ProductSource {
  INTERNAL = 'internal',
  SALLA = 'salla',
  ZID = 'zid',
}

export class UpdateProductSourceDto {
  @IsEnum(ProductSource)
  source!: ProductSource;

  @IsOptional()
  @IsIn(['immediate', 'background', 'none'])
  syncMode?: 'immediate' | 'background' | 'none';

  // اطلب كلمة المرور فقط إذا نغيّر لمصدر خارجي أو نريد مزامنة فورية
  @ValidateIf(
    (o) => o.source !== ProductSource.INTERNAL || o.syncMode === 'immediate',
  )
  @IsString()
  @MinLength(6)
  confirmPassword?: string;
}
