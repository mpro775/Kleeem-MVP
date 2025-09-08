import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorDto } from '../../../common/dto/pagination.dto';

export enum OrderSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetOrdersDto extends CursorDto {
  @ApiPropertyOptional({
    description: 'البحث في معرف الجلسة أو بيانات العميل',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'حالة الطلب',
    enum: ['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'],
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'])
  status?: string;

  @ApiPropertyOptional({
    description: 'مصدر الطلب',
    enum: ['manual', 'api', 'imported', 'mini-store', 'widget', 'storefront'],
  })
  @IsOptional()
  @IsEnum(['manual', 'api', 'imported', 'mini-store', 'widget', 'storefront'])
  source?: string;

  @ApiPropertyOptional({
    description: 'معرف الجلسة',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'ترتيب النتائج حسب',
    enum: OrderSortBy,
    default: OrderSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(OrderSortBy)
  sortBy?: OrderSortBy = OrderSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
