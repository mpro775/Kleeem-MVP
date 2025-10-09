// src/modules/webhooks/dto/telegram-webhook.dto.ts
import { IsString } from 'class-validator';

export class TelegramWebhookDto {
  @IsString()
  readonly messageId!: string;

  @IsString()
  readonly chatId!: string;

  @IsString()
  readonly text!: string;

  // أضف الحقول التي تعتمد عليها في المعالجة
}
