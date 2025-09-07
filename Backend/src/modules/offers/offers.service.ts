import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Merchant, MerchantDocument } from '../merchants/schemas/merchant.schema';

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
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

  private buildPublicUrl(p: any, publicSlug?: string): string | undefined {
    const slug = p.slug || String(p._id);
    if (p.storefrontDomain) return `https://${p.storefrontDomain}/p/${slug}`;
    if (p.storefrontSlug) return `/${p.storefrontSlug}/store/p/${slug}`;
    if (publicSlug) return `/${publicSlug}/store/p/${slug}`;
    return undefined;
  }

  async listAllOffers(
    merchantId: string,
    opts: { limit: number; offset: number },
  ) {
    const mId = new Types.ObjectId(merchantId);

    const [merchant, products] = await Promise.all([
      this.merchantModel.findById(mId).select('publicSlug').lean(),
      this.productModel
        .find({
          merchantId: mId,
          'offer.enabled': true,
          // وجود newPrice أو oldPrice يكفي، بنحسب الفعّالية لاحقًا
        })
        .sort({ updatedAt: -1 })
        .skip(opts.offset)
        .limit(opts.limit)
        .lean(),
    ]);

    const publicSlug = merchant?.publicSlug;

    return products.map((p) => {
      const isActive = this.computeIsActive(p.offer);
      const priceOld = p.offer?.oldPrice ?? p.price ?? null;
      const priceNew = p.offer?.newPrice ?? null;
      const priceEffective =
        isActive && priceNew != null
          ? Number(priceNew)
          : Number(p.price ?? priceNew ?? 0);

      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        priceOld: priceOld ?? null,
        priceNew,
        priceEffective,
        currency: p.currency,
        discountPct: this.discountPct(
          priceOld ?? undefined,
          priceNew ?? undefined,
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
    });
  }
}
