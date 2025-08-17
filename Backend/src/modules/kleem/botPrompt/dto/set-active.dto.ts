import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetActiveDto {
  @IsBoolean({ message: 'يجب أن تكون القيمة المنطقية (true/false)' })
  @ApiProperty({
    description: 'حالة تفعيل البرومبت',
    example: true,
    required: true
  })
  active: boolean;
}
