import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { I18nMessage } from '../../../../common/validators/i18n-validator';

export class SetActiveKaleemDto {
  @IsBoolean(I18nMessage('validation.boolean'))
  @ApiProperty({
    description: 'حالة تفعيل البرومبت',
    example: true,
    required: true,
  })
  active: boolean;
}
