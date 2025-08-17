import { PartialType } from '@nestjs/swagger';
import { CreateBotPromptDto } from './create-botPrompt.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBotPromptDto extends PartialType(CreateBotPromptDto) {
  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون حالة الأرشفة قيمة منطقية (true/false)' })
  @ApiPropertyOptional({
    description: 'حالة أرشفة البرومبت',
    default: false,
    example: false,
    deprecated: true, // Marking as deprecated as per the controller using archive endpoint
    readOnly: true   // Should be set via archive endpoint, not directly
  })
  archived?: boolean;
}
