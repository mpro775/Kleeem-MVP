import { Injectable, Inject } from '@nestjs/common';

import { MerchantRepository } from './repositories/merchant.repository';
import {
  ProductRepository,
  ProductLean,
  OfferInfo,
} from './repositories/product.repository';
import { PRODUCT_REPOSITORY, MERCHANT_REPOSITORY } from './tokens';

@Injectable()
export class OffersService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
    @Inject(MERCHANT_REPOSITORY)
    private readonly merchants: MerchantRepository,
  ) {}

  private computeIsActive(offer: OfferInfo): boolean {
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
    const slug = p.slug || String(p._id);
    if (p.storefrontDomain) return `https://${p.storefrontDomain}/p/${slug}`;
    if (p.storefrontSlug) return `/${p.storefrontSlug}/store/p/${slug}`;
    if (publicSlug) return `/${publicSlug}/store/p/${slug}`;
    return undefined;
  }

  async listAllOffers(
    merchantId: string,
    opts: { limit: number; offset: number },
  ): Promise<Record<string, unknown>[]> {
    const [publicSlug, products] = await Promise.all([
      this.merchants.getPublicSlug(merchantId),
      this.products.findOffersByMerchant(merchantId, opts),
    ]);

    return products.map((p) => this._transformProductToOffer(p, publicSlug));
  }

  private _transformProductToOffer(
    p: ProductLean,
    publicSlug?: string,
  ): Record<string, unknown> {
    const isActive = this.computeIsActive(p.offer ?? {});
    const prices = this._calculatePrices(p, isActive);

    return {
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      ...prices,
      currency: p.currency,
      discountPct: this.discountPct(
        prices.priceOld ?? undefined,
        prices.priceNew ?? undefined,
      ),
      url: this.buildPublicUrl(p, publicSlug),
      isActive,
      period: {
        startAt: p.offer?.startAt ?? null,
        endAt: p.offer?.endAt ?? null,
      },
      image:
        Array.isArray(p.images) && p.images.length ? p.images[0] : undefined,
    };
  }

  private _calculatePrices(
    p: ProductLean,
    isActive: boolean,
  ): {
    priceOld: number | null;
    priceNew: number | null;
    priceEffective: number;
  } {
    const priceOld = p.offer?.oldPrice ?? p.price ?? null;
    const priceNew = p.offer?.newPrice ?? null;
    const priceEffective =
      isActive && priceNew != null
        ? Number(priceNew)
        : Number(p.price ?? priceNew ?? 0);

    return {
      priceOld: priceOld ?? null,
      priceNew,
      priceEffective,
    };
  }
}
