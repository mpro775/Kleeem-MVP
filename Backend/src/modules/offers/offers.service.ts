import { Injectable, Inject } from '@nestjs/common';
import { PRODUCT_REPOSITORY, MERCHANT_REPOSITORY } from './tokens';
import {
  ProductRepository,
  ProductLean,
} from './repositories/product.repository';
import { MerchantRepository } from './repositories/merchant.repository';

@Injectable()
export class OffersService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
    @Inject(MERCHANT_REPOSITORY)
    private readonly merchants: MerchantRepository,
  ) {}

  private computeIsActive(offer: any): boolean {
    if (!offer?.enabled || offer?.newPrice == null) return false;
    const now = Date.now();
    const s = offer.startAt ? new Date(offer.startAt).getTime() : -Infinity;
    const e = offer.endAt ? new Date(offer.endAt).getTime() : Infinity;
    return now >= s && now <= e;
  }

  private discountPct(oldPrice?: number, newPrice?: number): number | null {
    if (oldPrice && newPrice != null && oldPrice > 0 && newPrice < oldPrice) {
      return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    }
    return null;
  }

  private buildPublicUrl(
    p: ProductLean,
    publicSlug?: string,
  ): string | undefined {
    const slug = (p as any).slug || String(p._id);
    if ((p as any).storefrontDomain)
      return `https://${(p as any).storefrontDomain}/p/${slug}`;
    if ((p as any).storefrontSlug)
      return `/${(p as any).storefrontSlug}/store/p/${slug}`;
    if (publicSlug) return `/${publicSlug}/store/p/${slug}`;
    return undefined;
  }

  async listAllOffers(
    merchantId: string,
    opts: { limit: number; offset: number },
  ) {
    const [publicSlug, products] = await Promise.all([
      this.merchants.getPublicSlug(merchantId),
      this.products.findOffersByMerchant(merchantId, opts),
    ]);

    return products.map((p) => {
      const isActive = this.computeIsActive((p as any).offer);
      const priceOld = (p as any).offer?.oldPrice ?? (p as any).price ?? null;
      const priceNew = (p as any).offer?.newPrice ?? null;
      const priceEffective =
        isActive && priceNew != null
          ? Number(priceNew)
          : Number((p as any).price ?? priceNew ?? 0);

      return {
        id: String(p._id),
        name: (p as any).name,
        slug: (p as any).slug,
        priceOld: priceOld ?? null,
        priceNew,
        priceEffective,
        currency: (p as any).currency,
        discountPct: this.discountPct(
          priceOld ?? undefined,
          priceNew ?? undefined,
        ),
        url: this.buildPublicUrl(p, publicSlug),
        isActive,
        period: {
          startAt: (p as any).offer?.startAt ?? null,
          endAt: (p as any).offer?.endAt ?? null,
        },
        image:
          Array.isArray((p as any).images) && (p as any).images.length
            ? (p as any).images[0]
            : undefined,
      };
    });
  }
}
