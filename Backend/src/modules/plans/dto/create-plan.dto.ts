// dto/create-plan.dto.ts
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Monthly' })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({ example: 2900, description: 'السعر بالسنتات' })
  @IsNumber()
  @Min(0)
  priceCents: number;
  @ApiProperty({ example: 'USD', enum: ['USD', 'SAR', 'AED', 'YER'] })
  @IsString()
  @IsIn(['USD', 'SAR', 'AED', 'YER'])
  currency: string;
  @ApiProperty({ example: 30 }) @IsNumber() @Min(1) durationDays: number;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  messageLimit?: number;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  llmEnabled?: boolean;
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({ example: 'وصف' })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ example: ['webchat', 'whatsapp'] })
  @IsOptional()
  @IsArray()
  features?: string[];
  @ApiPropertyOptional({ example: 'monthly', enum: ['monthly', 'annual'] })
  @IsOptional()
  @IsIn(['monthly', 'annual'])
  billingPeriod?: 'monthly' | 'annual';
  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trialPeriodDays?: number;
}

