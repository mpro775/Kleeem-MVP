import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsDocument,
} from './schema/chat-widget.schema';
import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';
import { v4 as uuidv4 } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatWidgetService {
  constructor(
    @InjectModel(ChatWidgetSettings.name)
    private readonly widgetModel: Model<ChatWidgetSettingsDocument>,
    private readonly http: HttpService,
  ) {}

  async getSettings(merchantId: string): Promise<ChatWidgetSettings> {
    const settings = await this.widgetModel.findOne({ merchantId }).lean();
    if (!settings) {
      // أنشئ إعدادات افتراضية عند الطلب لأول مرة
      const created = await this.widgetModel.create({ merchantId });
      return created.toObject();
    }
    return settings;
  }

  async updateSettings(
    merchantId: string,
    dto: UpdateWidgetSettingsDto,
  ): Promise<ChatWidgetSettings> {
    const settings = await this.widgetModel
      .findOneAndUpdate(
        { merchantId },
        { $set: dto },
        { new: true, upsert: true },
      )
      .exec();

    if (!settings) throw new NotFoundException('Settings not found');
    return settings.toObject();
  }
  async generateWidgetSlug(merchantId: string): Promise<string> {
    const base = (await this.getSettings(merchantId)).botName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let widgetSlug = base;
    const exists = await this.widgetModel.exists({ widgetSlug });
    if (exists) widgetSlug = `${base}-${uuidv4().slice(0, 6)}`;
    await this.widgetModel.findOneAndUpdate(
      { merchantId },
      { widgetSlug },
      { new: true },
    );
    return widgetSlug;
  }

  async getSettingsByWidgetSlug(widgetSlug: string) {
    const settings = await this.widgetModel.findOne({ widgetSlug }).lean();
    if (!settings) throw new NotFoundException('Widget not found');
    return settings;
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
        const url = settings.handoffConfig.webhookUrl as string;
        await firstValueFrom(
          this.http.post(url, {
            text: `Handoff requested: ${JSON.stringify(payload)}`,
          }),
        );
        break;
      }
      case 'email': {
        // مثال مبسط: استخدام SMTP service عبر API خارجي
        const emailApi = settings.handoffConfig.apiUrl as string;
        await firstValueFrom(
          this.http.post(emailApi, {
            to: settings.handoffConfig.to,
            subject: `Handoff for session ${dto.sessionId}`,
            body: JSON.stringify(payload),
          }),
        );
        break;
      }
      case 'webhook': {
        const url = settings.handoffConfig.url as string;
        await firstValueFrom(this.http.post(url, payload));
        break;
      }
    }
    return { success: true };
  }

  async getEmbedSettings(merchantId: string) {
    const settings = await this.widgetModel.findOne({ merchantId }).lean();
    if (!settings) throw new NotFoundException('Settings not found');
    const shareUrl = `/chat/${settings.widgetSlug}`;
    return {
      embedMode: settings.embedMode,
      availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
      shareUrl,
    };
  }

  /** تحديث وضعية الـ Embed */
  // داخل ChatWidgetService
  async updateEmbedSettings(merchantId: string, dto: { embedMode?: string }) {
    const updated = await this.widgetModel
      .findOneAndUpdate(
        { merchantId },
        dto.embedMode !== undefined ? { embedMode: dto.embedMode } : {},
        { new: true },
      )
      .lean();
    if (!updated) throw new NotFoundException('Settings not found');
    return {
      embedMode: updated.embedMode,
      shareUrl: `/chat/${updated.widgetSlug}`,
      availableModes: ['bubble', 'iframe', 'bar', 'conversational'], // ← أضف هذا
    };
  }
}
