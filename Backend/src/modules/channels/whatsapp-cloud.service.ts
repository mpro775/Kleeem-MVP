import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';

import { Channel, ChannelDocument } from '../channels/schemas/channel.schema';
import { decryptSecret } from '../channels/utils/secrets.util';

@Injectable()
export class WhatsappCloudService {
  private readonly logger = new Logger(WhatsappCloudService.name);
  // اسمح بتغيير نسخة الـ Graph من env، وإلا استخدم v19.0
  private base = (
    process.env.FB_GRAPH_BASE || 'https://graph.facebook.com/v19.0'
  ).replace(/\/+$/, '');

  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
  ) {}

  /**
   * اختيار وسيلة النقل لعميل معيّن (API / QR)
   * TODO: إن عندك جلسات/محادثات، استرجع آخر قناة استُقبلت منها الرسالة.
   */
  async detectTransport(
    merchantId: string,
    sessionId: string,
  ): Promise<'api' | 'qr'> {
    // 1) لو Cloud غير مفعلة أو ناقصة الاعتمادات → رجّع 'qr'
    const cloud = await this.getDefaultCloudChannel(merchantId);
    const cloudReady = !!(
      cloud?.enabled &&
      cloud?.accessTokenEnc &&
      cloud?.phoneNumberId
    );
    if (!cloudReady) return 'qr';

    // 2) (مستحسن) اقرأ آخر رسالة من المحادثة لو عندك MessageService وحدد المزود من metadata.provider
    // TODO: ابحث عن آخر incoming من نفس sessionId وحدد qr/api

    return 'api';
  }

  /** جلب قناة WhatsApp Cloud الافتراضية للتاجر */
  private async getDefaultCloudChannel(merchantId: string) {
    return this.channelModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        provider: 'whatsapp_cloud',
        isDefault: true,
        deletedAt: null,
      })
      .lean();
  }

  /** الحصول على الاعتمادات (Token + phoneNumberId) بعد فكّ التشفير */
  private async creds(merchantId: string) {
    const c = await this.getDefaultCloudChannel(merchantId);
    const tokenEnc = c?.accessTokenEnc;
    const phoneNumberId = c?.phoneNumberId;
    if (!tokenEnc || !phoneNumberId) {
      throw new Error('WhatsApp Cloud API not configured');
    }
    const token = decryptSecret(tokenEnc);
    return { token, phoneNumberId };
  }

  /** إرسال نص بسيط عبر WhatsApp Cloud */
  async sendText(merchantId: string, to: string, text: string) {
    const { token, phoneNumberId } = await this.creds(merchantId);
    try {
      await axios.post(
        `${this.base}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err: any) {
      this.logger.error(
        `WA Cloud sendText failed: ${err?.response?.status} ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message}`,
      );
      throw err;
    }
  }

  /** (اختياري) إرسال Template */
  async sendTemplate(
    merchantId: string,
    to: string,
    name: string,
    lang = 'ar',
  ) {
    const { token, phoneNumberId } = await this.creds(merchantId);
    await axios.post(
      `${this.base}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name, language: { code: lang } },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** (اختياري) جلب رابط وسائط Cloud API عبر mediaId */
  async getMediaUrl(merchantId: string, mediaId: string) {
    const { token } = await this.creds(merchantId);
    const r = await axios.get(`${this.base}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.data?.url as string | undefined;
  }
}
