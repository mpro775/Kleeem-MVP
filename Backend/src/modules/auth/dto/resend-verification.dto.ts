import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}
