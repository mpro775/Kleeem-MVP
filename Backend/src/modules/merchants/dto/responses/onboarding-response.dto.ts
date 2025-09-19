// src/modules/merchants/dto/onboarding-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantDocument } from '../../schemas/merchant.schema';

class WebhookInfo {
  @ApiProperty()
  hookUrl: string;

  @ApiProperty()
  telegramResponse: any;
}

export class OnboardingResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: Object }) // أو ApiProperty({ type: () => MerchantDto })
  merchant: MerchantDocument;

  @ApiPropertyOptional({ type: WebhookInfo })
  webhookInfo?: WebhookInfo;
}
