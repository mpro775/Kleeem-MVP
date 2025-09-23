import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

const WIDGET_SLUG_SUFFIX_LENGTH = 6;

import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';
import { ChatWidgetRepository } from './repositories/chat-widget.repository';
import { ChatWidgetSettings } from './schema/chat-widget.schema';

@Injectable()
export class ChatWidgetService {
  constructor(
    @Inject('ChatWidgetRepository')
    private readonly repo: ChatWidgetRepository,
    private readonly http: HttpService,
  ) {}

  async syncWidgetSlug(merchantId: string, slug: string): Promise<string> {
    await this.repo.setWidgetSlug(merchantId, slug);
    return slug;
  }

  async getSettings(merchantId: string): Promise<ChatWidgetSettings> {
    const settings = await this.repo.findOneByMerchant(merchantId);
    if (!settings) {
      return await this.repo.createDefault(merchantId);
    }
    return settings;
  }

  async updateSettings(
    merchantId: string,
    dto: UpdateWidgetSettingsDto,
  ): Promise<ChatWidgetSettings> {
    const settings = await this.repo.upsertAndReturn(merchantId, dto);
    if (!settings) throw new NotFoundException('Settings not found');
    return settings;
  }

  async generateWidgetSlug(merchantId: string): Promise<string> {
    const s = await this.getSettings(merchantId);
    const base =
      (s.botName || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') || 'bot';

    let widgetSlug = base;
    const exists = await this.repo.existsByWidgetSlug(widgetSlug);
    if (exists)
      widgetSlug = `${base}-${uuidv4().slice(0, WIDGET_SLUG_SUFFIX_LENGTH)}`;

    await this.repo.setWidgetSlug(merchantId, widgetSlug);
    return widgetSlug;
  }

  async getSettingsBySlugOrPublicSlug(
    slug: string,
  ): Promise<ChatWidgetSettings | null> {
    return this.repo.findBySlugOrPublicSlug(slug);
  }

  async getEmbedSettings(merchantId: string): Promise<{
    embedMode: string;
    availableModes: string[];
    shareUrl: string;
    colors: {
      headerBgColor: string;
      brandColor: string;
      onHeader: string;
    };
  }> {
    const s = await this.repo.findOneByMerchant(merchantId);
    if (!s) throw new NotFoundException('Settings not found');

    let headerBg = s.headerBgColor;
    let brand = s.brandColor;

    // استخدام ألوان الستورفرونت لو مفعّل
    if (s.useStorefrontBrand) {
      const sf = await this.repo.getStorefrontBrand(merchantId);
      const dark = sf?.brandDark || '#111827';
      headerBg = dark;
      brand = dark;
    }

    const publicSlug = await this.repo.getMerchantPublicSlug(merchantId);
    const shareUrl = `/${publicSlug ?? ''}/chat`;

    return {
      embedMode: s.embedMode,
      availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
      shareUrl,
      colors: {
        headerBgColor: headerBg,
        brandColor: brand,
        onHeader: '#FFFFFF',
      },
    };
  }

  async updateEmbedSettings(
    merchantId: string,
    dto: { embedMode?: string },
  ): Promise<{
    embedMode: string;
    shareUrl: string;
    availableModes: string[];
  }> {
    const updated = await this.repo.upsertAndReturn(
      merchantId,
      dto.embedMode !== undefined
        ? {
            embedMode: dto.embedMode as unknown as
              | 'bubble'
              | 'iframe'
              | 'bar'
              | 'conversational',
          }
        : {},
    );
    if (!updated) throw new NotFoundException('Settings not found');

    return {
      embedMode: updated.embedMode,
      shareUrl: `/chat/${updated.widgetSlug}`,
      availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
    };
  }
}
