import { PartialType } from '@nestjs/swagger';
import { UpdateStorefrontDto } from './create-storefront.dto';

export class UpdateStorefrontByMerchantDto extends PartialType(
  UpdateStorefrontDto,
) {}
