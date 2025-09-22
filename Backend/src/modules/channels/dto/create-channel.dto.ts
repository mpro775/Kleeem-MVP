// src/modules/channels/dto/create-channel.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ChannelProviderDto } from './channel-provider.enum';

export class CreateChannelDto {
  @ApiProperty({ enum: ChannelProviderDto })
  @IsEnum(ChannelProviderDto)
  provider: ChannelProviderDto;

  @ApiProperty({
    description: 'معرّف التاجر',
    example: '68a3addee395b1a94f9fcf87',
  })
  @IsMongoId()
  merchantId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
