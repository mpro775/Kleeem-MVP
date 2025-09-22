import { ApiProperty } from '@nestjs/swagger';

import { UserDto } from './user.dto';

export class TokenPairDto {
  @ApiProperty({ example: 'eyJhbGciOi...access' }) accessToken!: string;
  @ApiProperty({ example: 'eyJhbGciOi...refresh' }) refreshToken!: string;
  @ApiProperty({ type: UserDto }) user!: UserDto;
}
