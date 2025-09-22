// common/guards/throttler-tenant.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerTenantGuard extends ThrottlerGuard {
  protected getTracker(req: any): Promise<string> {
    // مفاتيح مخصّصة للتجميع لكل قناة/تاجر إن وُجدت
    const merchant = req?.params?.merchantId || req?.headers?.['x-merchant-id'];
    const channel = req?.params?.channelId || req?.headers?.['x-channel-id'];
    const user = req?.user?.sub || req?.user?.id;

    return (
      (merchant && channel && `m:${merchant}:c:${channel}`) ||
      (merchant && `m:${merchant}`) ||
      (user && `u:${user}`) ||
      this.getClientIp(req)
    );
  }

  /** استخراج IP خلف بروكسي/كلودفلير/Nginx */
  private getClientIp(req: any): string {
    // إذا كنتَ قد فعلت app.set('trust proxy', 1) (وهو موجود لديك)،
    // فـ Express يملأ req.ips بترتيب X-Forwarded-For (الأول هو العميل الحقيقي).
    if (Array.isArray(req?.ips) && req.ips.length > 0) {
      return req.ips[0];
    }

    // Cloudflare header (كاحتياط)
    const cf = req?.headers?.['cf-connecting-ip'];
    if (cf) return Array.isArray(cf) ? cf[0] : cf;

    // X-Forwarded-For القياسي
    const xff = req?.headers?.['x-forwarded-for'];
    if (xff) {
      const first = Array.isArray(xff) ? xff[0] : String(xff).split(',')[0];
      if (first) return first.trim();
    }

    // fallbacks
    return (
      req?.ip ||
      req?.connection?.remoteAddress ||
      req?.socket?.remoteAddress ||
      'unknown'
    );
  }
}
