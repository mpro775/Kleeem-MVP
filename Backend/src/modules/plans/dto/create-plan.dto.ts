// src/modules/plans/dto/create-plan.dto.ts
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ description: 'اسم الخطة', example: 'Standard Plan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'سعر الخطة بالدولار', example: 29.99 })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ description: 'مدة الاشتراك بالأيام', example: 30 })
  @IsNumber()
  @IsNotEmpty()
  duration: number;
}
