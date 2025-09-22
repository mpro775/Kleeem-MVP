// src/modules/webhooks/dto/telegram-update.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class TelegramUserDto {
  @IsNumber()
  id: number;

  @IsBoolean()
  @IsOptional()
  is_bot?: boolean;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  language_code?: string;
}

class TelegramChatDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  type: string;
}

class TelegramMessageEntityDto {
  @IsString()
  type: string;

  @IsNumber()
  offset: number;

  @IsNumber()
  length: number;

  @IsString()
  @IsOptional()
  url?: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  @IsOptional()
  user?: TelegramUserDto;
}

class TelegramMessageDto {
  @IsNumber()
  message_id: number;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  @IsOptional()
  from?: TelegramUserDto;

  @ValidateNested()
  @Type(() => TelegramChatDto)
  @IsOptional()
  sender_chat?: TelegramChatDto;

  @IsNumber()
  date: number;

  @ValidateNested()
  @Type(() => TelegramChatDto)
  chat: TelegramChatDto;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  @IsOptional()
  forward_from?: TelegramUserDto;

  @ValidateNested()
  @Type(() => TelegramChatDto)
  @IsOptional()
  forward_from_chat?: TelegramChatDto;

  @IsNumber()
  @IsOptional()
  forward_from_message_id?: number;

  @IsString()
  @IsOptional()
  forward_signature?: string;

  @IsString()
  @IsOptional()
  forward_sender_name?: string;

  @IsNumber()
  @IsOptional()
  forward_date?: number;

  @IsBoolean()
  @IsOptional()
  is_automatic_forward?: boolean;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  reply_to_message?: TelegramMessageDto;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  @IsOptional()
  via_bot?: TelegramUserDto;

  @IsNumber()
  @IsOptional()
  edit_date?: number;

  @IsBoolean()
  @IsOptional()
  has_protected_content?: boolean;

  @IsString()
  @IsOptional()
  media_group_id?: string;

  @IsString()
  @IsOptional()
  author_signature?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelegramMessageEntityDto)
  @IsOptional()
  entities?: TelegramMessageEntityDto[];

  @IsObject()
  @IsOptional()
  animation?: any;

  @IsObject()
  @IsOptional()
  audio?: any;

  @IsObject()
  @IsOptional()
  document?: any;

  @IsObject()
  @IsOptional()
  photo?: any[];

  @IsObject()
  @IsOptional()
  sticker?: any;

  @IsObject()
  @IsOptional()
  video?: any;

  @IsObject()
  @IsOptional()
  video_note?: any;

  @IsObject()
  @IsOptional()
  voice?: any;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelegramMessageEntityDto)
  @IsOptional()
  caption_entities?: TelegramMessageEntityDto[];

  @IsObject()
  @IsOptional()
  contact?: any;

  @IsObject()
  @IsOptional()
  dice?: any;

  @IsObject()
  @IsOptional()
  game?: any;

  @IsObject()
  @IsOptional()
  poll?: any;

  @IsObject()
  @IsOptional()
  venue?: any;

  @IsObject()
  @IsOptional()
  location?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelegramUserDto)
  @IsOptional()
  new_chat_members?: TelegramUserDto[];

  @ValidateNested()
  @Type(() => TelegramUserDto)
  @IsOptional()
  left_chat_member?: TelegramUserDto;

  @IsString()
  @IsOptional()
  new_chat_title?: string;

  @IsArray()
  @IsOptional()
  new_chat_photo?: any[];

  @IsBoolean()
  @IsOptional()
  delete_chat_photo?: boolean;

  @IsBoolean()
  @IsOptional()
  group_chat_created?: boolean;

  @IsBoolean()
  @IsOptional()
  supergroup_chat_created?: boolean;

  @IsBoolean()
  @IsOptional()
  channel_chat_created?: boolean;

  @IsObject()
  @IsOptional()
  message_auto_delete_timer_changed?: any;

  @IsNumber()
  @IsOptional()
  migrate_to_chat_id?: number;

  @IsNumber()
  @IsOptional()
  migrate_from_chat_id?: number;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  pinned_message?: TelegramMessageDto;

  @IsObject()
  @IsOptional()
  invoice?: any;

  @IsObject()
  @IsOptional()
  successful_payment?: any;

  @IsString()
  @IsOptional()
  connected_website?: string;

  @IsObject()
  @IsOptional()
  passport_data?: any;

  @IsObject()
  @IsOptional()
  proximity_alert_triggered?: any;

  @IsObject()
  @IsOptional()
  voice_chat_started?: any;

  @IsObject()
  @IsOptional()
  voice_chat_ended?: any;

  @IsObject()
  @IsOptional()
  voice_chat_participants_invited?: any;

  @IsObject()
  @IsOptional()
  reply_markup?: any;
}

class TelegramCallbackQueryDto {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  message?: TelegramMessageDto;

  @IsString()
  @IsOptional()
  inline_message_id?: string;

  @IsString()
  chat_instance: string;

  @IsString()
  @IsOptional()
  data?: string;

  @IsString()
  @IsOptional()
  game_short_name?: string;
}

class TelegramInlineQueryDto {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @IsString()
  @IsOptional()
  location?: any;

  @IsString()
  query: string;

  @IsString()
  offset: string;
}

class TelegramChosenInlineResultDto {
  @IsString()
  result_id: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @IsString()
  @IsOptional()
  location?: any;

  @IsString()
  @IsOptional()
  inline_message_id?: string;

  @IsString()
  query: string;
}

class TelegramShippingQueryDto {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @IsString()
  invoice_payload: string;

  @IsObject()
  shipping_address: any;
}

class TelegramPreCheckoutQueryDto {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @IsString()
  currency: string;

  @IsString()
  total_amount: number;

  @IsString()
  invoice_payload: string;

  @IsString()
  @IsOptional()
  shipping_option_id?: string;

  @IsObject()
  @IsOptional()
  order_info?: any;
}

class TelegramPollAnswerDto {
  @IsString()
  poll_id: string;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  user: TelegramUserDto;

  @IsArray()
  @IsNumber({}, { each: true })
  option_ids: number[];
}

class TelegramChatMemberUpdatedDto {
  @ValidateNested()
  @Type(() => TelegramChatDto)
  chat: TelegramChatDto;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @IsNumber()
  date: number;

  @IsObject()
  old_chat_member: any;

  @IsObject()
  new_chat_member: any;

  @IsObject()
  @IsOptional()
  invite_link?: any;
}

class TelegramChatJoinRequestDto {
  @ValidateNested()
  @Type(() => TelegramChatDto)
  chat: TelegramChatDto;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from: TelegramUserDto;

  @IsNumber()
  date: number;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsObject()
  @IsOptional()
  invite_link?: any;
}

export class TelegramUpdateDto {
  @IsNumber()
  update_id: number;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  message?: TelegramMessageDto;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  edited_message?: TelegramMessageDto;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  channel_post?: TelegramMessageDto;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  edited_channel_post?: TelegramMessageDto;

  @ValidateNested()
  @Type(() => TelegramCallbackQueryDto)
  @IsOptional()
  callback_query?: TelegramCallbackQueryDto;

  @ValidateNested()
  @Type(() => TelegramInlineQueryDto)
  @IsOptional()
  inline_query?: TelegramInlineQueryDto;

  @ValidateNested()
  @Type(() => TelegramChosenInlineResultDto)
  @IsOptional()
  chosen_inline_result?: TelegramChosenInlineResultDto;

  @ValidateNested()
  @Type(() => TelegramShippingQueryDto)
  @IsOptional()
  shipping_query?: TelegramShippingQueryDto;

  @ValidateNested()
  @Type(() => TelegramPreCheckoutQueryDto)
  @IsOptional()
  pre_checkout_query?: TelegramPreCheckoutQueryDto;

  @ValidateNested()
  @Type(() => TelegramPollAnswerDto)
  @IsOptional()
  poll_answer?: TelegramPollAnswerDto;

  @ValidateNested()
  @Type(() => TelegramChatMemberUpdatedDto)
  @IsOptional()
  my_chat_member?: TelegramChatMemberUpdatedDto;

  @ValidateNested()
  @Type(() => TelegramChatMemberUpdatedDto)
  @IsOptional()
  chat_member?: TelegramChatMemberUpdatedDto;

  @ValidateNested()
  @Type(() => TelegramChatJoinRequestDto)
  @IsOptional()
  chat_join_request?: TelegramChatJoinRequestDto;
}
