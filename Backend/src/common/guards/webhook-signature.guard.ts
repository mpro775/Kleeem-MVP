import * as crypto from 'crypto';

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import {
  ChannelsRepository,
  ChannelSecretsLean,
} from '../../modules/channels/repositories/channels.repository';
import { ChannelProvider } from '../../modules/channels/schemas/channel.schema';
import { decryptSecret } from '../../modules/channels/utils/secrets.util';

type Detected =
  | { provider: ChannelProvider.WHATSAPP_CLOUD; channelId: string }
  | { provider: ChannelProvider.TELEGRAM; channelId: string }
  | { provider: ChannelProvider.WHATSAPP_QR; channelId: string }
  | { provider: 'unknown'; channelId?: string };

function timingSafeEqStr(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(
    @Inject('ChannelsRepository')
    private readonly channelsRepo: ChannelsRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const det = this.detect(req);

    if (det.provider === 'unknown' || !det.channelId) {
      throw new ForbiddenException('Unknown webhook route');
    }

    const ch = await this.channelsRepo.findByIdWithSecrets(det.channelId);
    if (!ch || ch.deletedAt || ch.enabled === false) {
      throw new ForbiddenException('Channel not available');
    }

    // تأكد أن مزود القناة يطابق المسار
    if (!this.providerMatchesRoute(ch, det.provider)) {
      throw new ForbiddenException('Channel/provider mismatch');
    }

    let ok = false;
    switch (det.provider) {
      case ChannelProvider.WHATSAPP_CLOUD:
        ok = this.verifyWhatsAppCloud(req, ch);
        break;
      case ChannelProvider.TELEGRAM:
        ok = this.verifyTelegram(req, ch);
        break;
      case ChannelProvider.WHATSAPP_QR:
        ok = this.verifyEvolution(req, ch);
        break;
    }

    if (!ok) {
      throw new ForbiddenException('Signature verification failed');
    }

    // مرّر معلومات القناة/التاجر للمعالجة اللاحقة
    (req as any).merchantId = ch.merchantId;
    (req as any).channel = ch;
    return true;
  }

  private detect(req: Request): Detected {
    // نستخدم baseUrl+path لأن بعض الإطارات تضيف baseUrl
    const full = (req.baseUrl || '') + (req.path || '');
    const params = (req as any).params || {};

    if (/\/webhooks\/whatsapp_cloud\//.test(full)) {
      return {
        provider: ChannelProvider.WHATSAPP_CLOUD,
        channelId: params.channelId,
      };
    }
    if (/\/webhooks\/telegram\//.test(full)) {
      return {
        provider: ChannelProvider.TELEGRAM,
        channelId: params.channelId,
      };
    }
    if (/\/webhooks\/whatsapp_qr\//.test(full)) {
      return {
        provider: ChannelProvider.WHATSAPP_QR,
        channelId: params.channelId,
      };
    }
    return { provider: 'unknown' };
  }

  private providerMatchesRoute(
    ch: ChannelSecretsLean,
    routeProvider: ChannelProvider,
  ): boolean {
    return ch.provider === routeProvider;
  }

  // ======== WhatsApp Cloud (Meta) ========
  private verifyWhatsAppCloud(req: Request, ch: ChannelSecretsLean): boolean {
    const sig = req.headers['x-hub-signature-256'] as string;
    if (!sig || !sig.startsWith('sha256=')) return false;
    if (!ch.appSecretEnc) return false;

    const raw = (req as any).rawBody as Buffer | undefined;
    if (!raw || raw.length === 0) return false;

    const appSecret = decryptSecret(ch.appSecretEnc);
    const theirs = Buffer.from(sig.split('=')[1], 'hex');
    const ours = crypto.createHmac('sha256', appSecret).update(raw).digest();

    return (
      theirs.length === ours.length && crypto.timingSafeEqual(theirs, ours)
    );
  }

  // ======== Telegram ========
  private verifyTelegram(req: Request, _ch: ChannelSecretsLean): boolean {
    // الافضل حفظ secret_token لكل قناة لاحقًا. الآن نستخدم ENV عام:
    const got = req.headers['x-telegram-bot-api-secret-token'] as
      | string
      | undefined;
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET || '';
    return timingSafeEqStr(got, expected);
  }

  // ======== WhatsApp QR (Evolution) ========
  private verifyEvolution(req: Request, _ch: ChannelSecretsLean): boolean {
    const got = (req.headers['x-evolution-apikey'] || req.headers['apikey']) as
      | string
      | undefined;
    const expected =
      process.env.EVOLUTION_APIKEY || process.env.EVOLUTION_API_KEY || '';
    return timingSafeEqStr(got, expected);
  }
}
