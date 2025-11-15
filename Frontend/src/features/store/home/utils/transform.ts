// =========================
// File: src/features/store/utils/transform.ts
// =========================
import type { Currency } from "@/features/mechant/products/type";
import type { OfferItem, ProductResponse } from "../types";
import type { Offer } from "@/features/mechant/products/type";

// نوع خفيف لعرض الـ offer بدون any
type OfferShape = {
  enabled: boolean;
  oldPrice?: number | null;
  newPrice?: number | null;
  startAt?: string | null;
  endAt?: string | null;
};

// نقرأ offer السابق من الـ base إن وُجد (بدون any)
function readPrevOffer(base?: ProductResponse): Pick<OfferShape, "oldPrice" | "newPrice"> | undefined {
  const maybe = (base as unknown as { offer?: { oldPrice?: number | null; newPrice?: number | null } } | undefined)?.offer;
  return maybe ? { oldPrice: maybe.oldPrice, newPrice: maybe.newPrice } : undefined;
}

export function mapOffersToProducts(
  offers: OfferItem[],
  productById: Map<string, ProductResponse>
): ProductResponse[] {
  if (!Array.isArray(offers) || offers.length === 0) return [];

  return offers.map((o) => {
    const base = productById.get(o.id);

    // price: الأولوية (effective -> new -> base.price -> 0)
    const basePrice =
      typeof (base as unknown as { price?: unknown })?.price === "number"
        ? (base as unknown as { price?: number }).price
        : undefined;
    const price = o.priceEffective ?? o.priceNew ?? basePrice ?? 0;

    // images: صورة العرض إن وُجدت وإلا صور المنتج
    const images = o.image ? [o.image] : Array.isArray(base?.images) ? base!.images : [];

    // currency: عرض -> base -> "SAR"
    const currency = o.currency ?? base?.currency ?? "SAR";

    // offer المُركّبة (مع الاستفادة من القيم السابقة إن وُجدت)
    const prev = readPrevOffer(base);
    const offer: OfferShape = {
      enabled: true,
      oldPrice: o.priceOld ?? prev?.oldPrice,
      newPrice: o.priceNew ?? prev?.newPrice,
      startAt: o.period?.startAt ?? null,
      endAt: o.period?.endAt ?? null,
    };

    // ندمج مع base بدون any
    const merged: Partial<ProductResponse> = {
      ...(base ?? ({} as Partial<ProductResponse>)),
      _id: o.id,
      name: o.name ?? base?.name ?? "",
      images,
      price,
      currency: currency as Currency,
      hasActiveOffer: o.isActive,
      priceEffective: o.priceEffective ?? undefined,
      offer: offer as Offer,
    };

    return merged as ProductResponse;
  });
}
