// src/modules/webhook/dto/handle-webhook.dto.ts
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
      changes: { price: 99.99 },
    },
    type: Object,
  })
  @IsObject()
  @IsOptional()
  payload?: any;
}
