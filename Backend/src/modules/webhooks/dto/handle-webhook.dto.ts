// src/modules/webhook/dto/handle-webhook.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
const PRICE = 99.99;
export class HandleWebhookDto {
  @ApiProperty({
    description: 'نوع الحدث (مثل: product.updated، order.created)',
    example: 'product.updated',
  })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiPropertyOptional({
    description: 'البيانات المصاحبة للحدث',
    example: {
      productId: '64a2e3f2a9d1c2bce8351b32',
      changes: { price: PRICE },
    },
    type: Object,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
