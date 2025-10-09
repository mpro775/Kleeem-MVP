import { IsString, MinLength } from 'class-validator';

import { I18nMessage } from '../../../common/validators/i18n-validator';

export class ChangePasswordDto {
  @IsString(I18nMessage('validation.string'))
  currentPassword!: string;

  @IsString(I18nMessage('validation.string'))
  @MinLength(8, I18nMessage('validation.minLength'))
  newPassword!: string;

  @IsString(I18nMessage('validation.string'))
  @MinLength(8, I18nMessage('validation.minLength'))
  confirmPassword!: string;
}
