import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: '66f0c3a2b1...' }) id!: string;
  @ApiProperty({ example: 'أحمد' }) name!: string;
  @ApiProperty({ example: 'user@example.com' }) email!: string;
  @ApiProperty({ example: 'MERCHANT', enum: ['ADMIN', 'MERCHANT', 'MEMBER'] })
  role!: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  @ApiPropertyOptional({ example: 'mrc_123', nullable: true }) merchantId?:
    | string
    | null;
  @ApiProperty({ example: true }) firstLogin!: boolean;
  @ApiProperty({ example: true }) emailVerified!: boolean;
}
