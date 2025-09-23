// common/guards/throttler-tenant.guard.ts

// external (alphabetized)
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// type-only
import type { Request } from 'express';

// -----------------------------------------------------------------------------

type AugmentedRequest = Request & {
  params?: {
    merchantId?: string;
    channelId?: string;
  };
  headers: Request['headers'] & {
    'x-merchant-id'?: string | string[];
    'x-channel-id'?: string | string[];
    'cf-connecting-ip'?: string | string[];
    'x-forwarded-for'?: string | string[];
  };
  user?: {
    sub?: string | number;
    id?: string | number;
  };
  /** متاح عندما تكون trust proxy مفعّلة */
  ips?: string[];
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class ThrottlerTenantGuard extends ThrottlerGuard {
  /** مفتاح التجميع: تاجر+قناة أو تاجر فقط أو مستخدم أو IP */
  protected getTracker(req: AugmentedRequest): Promise<string> {
    const merchant = this.getMerchantId(req);
    const channel = this.getChannelId(req);
    const userId = this.getUserId(req);

    if (merchant && channel) {
      return Promise.resolve(`m:${merchant}:c:${channel}`);
    }
    if (merchant) {
      return Promise.resolve(`m:${merchant}`);
    }
    if (userId) {
      return Promise.resolve(`u:${userId}`);
    }
    return Promise.resolve(this.getClientIp(req));
  }

  private getMerchantId(req: AugmentedRequest): string | undefined {
    return req.params?.merchantId ?? firstHeader(req.headers['x-merchant-id']);
  }

  private getChannelId(req: AugmentedRequest): string | undefined {
    return req.params?.channelId ?? firstHeader(req.headers['x-channel-id']);
  }

  private getUserId(req: AugmentedRequest): string | undefined {
    const userIdRaw = req.user?.sub ?? req.user?.id;
    return typeof userIdRaw === 'number' ? String(userIdRaw) : userIdRaw;
  }

  /** استخراج IP خلف بروكسي/كلودفلير/Nginx */
  private getClientIp(req: AugmentedRequest): string {
    // Express يملأ req.ips عند تفعيل trust proxy
    if (Array.isArray(req.ips) && req.ips.length > 0) {
      return req.ips[0];
    }

    // Cloudflare
    const cf = firstHeader(req.headers['cf-connecting-ip']);
    if (cf) return cf;

    // X-Forwarded-For
    const xff = firstHeader(req.headers['x-forwarded-for']);
    if (xff) {
      const first = String(xff).split(',')[0];
      if (first) return first.trim();
    }

    // fallbacks
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }
}
