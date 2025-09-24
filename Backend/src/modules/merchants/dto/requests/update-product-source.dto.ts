import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { MIN_PASSWORD_LENGTH } from '../../../../common/constants/common';

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
    (o: UpdateProductSourceDto) =>
      o.source !== ProductSource.INTERNAL || o.syncMode === 'immediate',
  )
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  confirmPassword?: string;
}
