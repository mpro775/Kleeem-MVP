// create-category.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId, IsInt, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty() @IsString() name!: string;

  @ApiProperty() @IsMongoId() merchantId!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsMongoId() parent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  keywords!: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsString() slug?: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order!: number;

  @ApiProperty({ required: false, description: 'عنوان SEO' })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false, description: 'وصف SEO' })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false, description: 'أيقونة الفئة' })
  @IsOptional()
  @IsString()
  icon?: string;
}

// move-category.dto.ts
