// =========================
// File: src/features/store/utils/transform.ts
// =========================
import type { OfferItem, ProductResponse } from "../types";

export function mapOffersToProducts(
  offers: OfferItem[],
  productById: Map<string, ProductResponse>
): ProductResponse[] {
  if (!Array.isArray(offers)) return [];
  return offers.map((o) => {
    const base = productById.get(o.id);
    const price = o.priceEffective ?? o.priceNew ?? (base as any)?.price ?? 0;

    return {
      ...(base ?? ({} as any)),
      _id: o.id,
      name: o.name ?? base?.name ?? "",
      images: o.image ? [o.image] : base?.images ?? [],
      price,
      currency: (o.currency as any) ?? (base as any)?.currency ?? "SAR",
      hasActiveOffer: o.isActive as any,
      priceEffective: o.priceEffective ?? undefined,
      offer: {
        enabled: true,
        oldPrice: o.priceOld ?? (base as any)?.offer?.oldPrice,
        newPrice: o.priceNew ?? (base as any)?.offer?.newPrice,
        startAt: o.period?.startAt,
        endAt: o.period?.endAt,
      } as any,
    } as ProductResponse;
  });
}

