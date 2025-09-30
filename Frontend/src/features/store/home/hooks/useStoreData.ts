// =========================
// File: src/features/store/hooks/useStoreData.ts
// =========================
import { useEffect, useMemo, useState } from "react";
import { getStorefrontInfo } from "@/features/mechant/storefront-theme/api";
import { getMerchantInfo } from "@/features/mechant/merchant-settings/api";
import { setBrandVars } from "@/features/shared/brandCss";
import { type Category, type MerchantInfo, type ProductResponse, type Storefront, type OfferItem, type StorefrontEnvelope,  isObj, pickId } from "../types";
import { fetchStore, fetchPublicResolver, fetchProducts, fetchCategories, fetchOffers } from "../api";

export function resolveTargetSlug(slugOrId: string | undefined, isDemo: boolean) {
  const DEMO = import.meta.env.VITE_DEMO_MERCHANT_SLUG_OR_ID;
  if (isDemo && DEMO) return DEMO;
  return slugOrId ?? "demo";
}

export function extractMerchantId(data: unknown): string | null {
  if (!isObj(data)) return null;
  const env = data as Partial<StorefrontEnvelope>;

  // 1) merchantId في الجذر
  if (typeof env.merchantId === "string") return env.merchantId;

  // 2) merchant (string أو object)
  const m1 = pickId(env.merchant);
  if (m1) return m1;

  // 3) تحت store / storefront
  const m2 = pickId(env.store?.merchant);
  if (m2) return m2;

  const m3 = pickId(env.storefront?.merchant);
  if (m3) return m3;

  return null;
}

export function useStoreData(slug: string | undefined, isDemo: boolean, onError?: (e: unknown) => void) {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true); setError("");
        const target = resolveTargetSlug(slug, isDemo);
        const data = await fetchStore(target);

        let mid = extractMerchantId(data);
        if (!mid) {
          const pub = await fetchPublicResolver(target);
          mid = pickId(pub?.merchant) || (typeof pub?.merchantId === "string" ? pub.merchantId : null) || null;
        }
        if (!mid) throw new Error("تعذر تحديد هوية التاجر من هذا السلاج.");

        const [miRes, sfRes] = await Promise.all([
          getMerchantInfo(mid),
          getStorefrontInfo(mid),
        ]);
        if (!mounted) return;
        setMerchant(miRes);
        const sf = { ...sfRes, banners: Array.isArray(sfRes?.banners) ? sfRes.banners : [] } as Storefront;
        setStorefront(sf);
        setBrandVars((sf)?.brandDark || "#111827");

        if (Array.isArray(data?.products) && Array.isArray(data?.categories)) {
          setProducts(data.products);
          setCategories(data.categories);
        } else {
          const [prods, cats] = await Promise.all([
            fetchProducts(mid),
            fetchCategories(mid),
          ]);
          if (!mounted) return;
          setProducts(prods ?? []);
          setCategories(cats ?? []);
        }

        try {
          setOffersLoading(true);
          const off = await fetchOffers(mid);
          if (!mounted) return;
          setOffers(off);
        } finally {
          if (mounted) setOffersLoading(false);
        }
      } catch (e: unknown) {  
        setError((e as Error)?.message || "فشل تحميل بيانات المتجر");
        onError?.(e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug, isDemo, onError]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductResponse>();
    if (Array.isArray(products)) for (const p of products) m.set(p._id, p);
    return m;
  }, [products]);

  return { merchant, storefront, products, categories, productById, offers, offersLoading, isLoading, error } as const;
}
