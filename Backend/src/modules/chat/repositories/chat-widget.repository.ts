import { Types } from 'mongoose';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsDocument,
} from '../schema/chat-widget.schema';

export interface ChatWidgetRepository {
  // أساسيات
  findOneByMerchant(
    merchantId: string | Types.ObjectId,
  ): Promise<ChatWidgetSettings | null>;
  createDefault(
    merchantId: string | Types.ObjectId,
  ): Promise<ChatWidgetSettings>;
  upsertAndReturn(
    merchantId: string | Types.ObjectId,
    setDoc: Partial<ChatWidgetSettings>,
  ): Promise<ChatWidgetSettings>;

  setWidgetSlug(
    merchantId: string | Types.ObjectId,
    slug: string,
  ): Promise<void>;
  existsByWidgetSlug(slug: string): Promise<boolean>;
  findBySlugOrPublicSlug(slug: string): Promise<ChatWidgetSettings | null>;

  // قراءات مساندة من جداول أخرى
  getStorefrontBrand(
    merchantId: string | Types.ObjectId,
  ): Promise<{ brandDark?: string } | null>;
  getMerchantPublicSlug(
    merchantId: string | Types.ObjectId,
  ): Promise<string | null>;
}
