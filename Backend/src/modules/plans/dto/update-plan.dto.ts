// src/modules/plans/dto/update-plan.dto.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiPropertyOptional({ description: 'اسم الخطة', example: 'Premium Plan' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'السعر الجديد', example: 49.99 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'المدة الجديدة بالأيام', example: 60 })
  @IsOptional()
  @IsNumber()
  duration?: number;
}
