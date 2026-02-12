import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateMerchantAdminDto {
  @ApiPropertyOptional({
    description: 'تفعيل/إيقاف ظهور المتجر',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'حالة التاجر',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';
}
