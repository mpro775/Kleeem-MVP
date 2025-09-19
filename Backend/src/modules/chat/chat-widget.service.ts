import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChatWidgetSettings } from './schema/chat-widget.schema';
import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';
import { ChatWidgetRepository } from './repositories/chat-widget.repository';

@Injectable()
export class ChatWidgetService {
  constructor(
    @Inject('ChatWidgetRepository')
    private readonly repo: ChatWidgetRepository,
    private readonly http: HttpService,
  ) {}

  async syncWidgetSlug(merchantId: string, slug: string) {
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
    if (exists) widgetSlug = `${base}-${uuidv4().slice(0, 6)}`;

    await this.repo.setWidgetSlug(merchantId, widgetSlug);
    return widgetSlug;
  }

  async getSettingsBySlugOrPublicSlug(slug: string) {
    return this.repo.findBySlugOrPublicSlug(slug);
  }

  async handleHandoff(
    merchantId: string,
    dto: { sessionId: string; note?: string },
  ) {
    const settings = await this.getSettings(merchantId);
    if (!settings.handoffEnabled) {
      throw new BadRequestException('Handoff not enabled');
    }

    const payload = {
      sessionId: dto.sessionId,
      note: dto.note,
      merchantId,
    };

    switch (settings.handoffChannel) {
      case 'slack': {
        const url = (settings.handoffConfig as any)?.webhookUrl as string;
        if (!url) throw new BadRequestException('Slack webhook not configured');
        await firstValueFrom(
          this.http.post(url, {
            text: `Handoff requested: ${JSON.stringify(payload)}`,
          }),
        );
        break;
      }
      case 'email': {
        const apiUrl = (settings.handoffConfig as any)?.apiUrl as string;
        const to = (settings.handoffConfig as any)?.to as string;
        if (!apiUrl || !to)
          throw new BadRequestException('Email handoff not configured');
        await firstValueFrom(
          this.http.post(apiUrl, {
            to,
            subject: `Handoff for session ${dto.sessionId}`,
            body: JSON.stringify(payload),
          }),
        );
        break;
      }
      case 'webhook': {
        const url = (settings.handoffConfig as any)?.url as string;
        if (!url) throw new BadRequestException('Webhook URL not configured');
        await firstValueFrom(this.http.post(url, payload));
        break;
      }
      default:
        throw new BadRequestException('Unknown handoff channel');
    }
    return { success: true };
  }

  async getEmbedSettings(merchantId: string) {
    const s = await this.repo.findOneByMerchant(merchantId);
    if (!s) throw new NotFoundException('Settings not found');

    let headerBg = s.headerBgColor;
    let brand = s.brandColor;

    // استخدام ألوان الستورفرونت لو مفعّل
    if ((s as any).useStorefrontBrand) {
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

  async updateEmbedSettings(merchantId: string, dto: { embedMode?: string }) {
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
