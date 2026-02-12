import { Type } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsMongoId,
} from 'class-validator';

import { ChannelProvider, ChannelStatus } from '../schemas/channel.schema';

export class QueryAdminChannelsDto {
  @IsOptional()
  @IsMongoId()
  merchantId?: string;

  @IsOptional()
  @IsEnum(ChannelProvider)
  provider?: ChannelProvider;

  @IsOptional()
  @IsEnum(ChannelStatus)
  status?: ChannelStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 30;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;
}
