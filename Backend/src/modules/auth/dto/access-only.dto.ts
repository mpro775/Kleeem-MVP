import { ApiProperty } from '@nestjs/swagger';

import { UserDto } from './user.dto';

export class AccessOnlyDto {
  @ApiProperty({ example: 'eyJhbGciOi...access' }) accessToken!: string;
  @ApiProperty({ type: UserDto }) user!: UserDto;
}
