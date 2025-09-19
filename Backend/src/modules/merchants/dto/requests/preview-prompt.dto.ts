// src/modules/merchants/dto/preview-prompt.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
} from 'class-validator';
import { QuickConfigDto } from './quick-config.dto';

export class PreviewPromptDto {
  @ApiPropertyOptional({ type: QuickConfigDto })
  @IsOptional()
  quickConfig?: Partial<QuickConfigDto>;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsDefined()
  useAdvanced: boolean;

  @ApiProperty({ example: { productName: 'هاتف ذكي', customerName: 'أحمد' } })
  @IsObject()
  @IsNotEmptyObject()
  testVars: Record<string, string>;

  @ApiPropertyOptional({ enum: ['agent', 'merchant'], default: 'merchant' })
  @IsOptional()
  @IsIn(['agent', 'merchant'])
  audience?: 'agent' | 'merchant';
}
