import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorDto } from '../../../common/dto/pagination.dto';

export enum ProductSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  PRICE = 'price',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetProductsDto extends CursorDto {
  @ApiPropertyOptional({
    description: 'البحث في الاسم والوصف',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'معرف الفئة',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'حالة المنتج',
    enum: ['active', 'inactive', 'out_of_stock'],
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'out_of_stock'])
  status?: string;

  @ApiPropertyOptional({
    description: 'مصدر المنتج',
    enum: ['manual', 'api'],
  })
  @IsOptional()
  @IsEnum(['manual', 'api'])
  source?: string;

  @ApiPropertyOptional({
    description: 'المنتجات المتوفرة فقط',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'المنتجات التي لديها عروض فقط',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  hasOffer?: boolean;

  @ApiPropertyOptional({
    description: 'ترتيب النتائج حسب',
    enum: ProductSortBy,
    default: ProductSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
