// =========================
// File: src/features/store/hooks/useStoreData.ts
// =========================
import { useEffect, useMemo, useState } from "react";
import { getStorefrontInfo } from "@/features/mechant/storefront-theme/api";
import { getMerchantInfo } from "@/features/mechant/merchant-settings/api";
import { setBrandVars } from "@/features/shared/brandCss";
import type { Category, MerchantInfo, ProductResponse, Storefront, OfferItem } from "../types";
import { fetchStore, fetchPublicResolver, fetchProducts, fetchCategories, fetchOffers } from "../api";

export function resolveTargetSlug(slugOrId: string | undefined, isDemo: boolean) {
  const DEMO = import.meta.env.VITE_DEMO_MERCHANT_SLUG_OR_ID;
  if (isDemo && DEMO) return DEMO;
  return slugOrId ?? "demo";
}

export function extractMerchantId(data: any): string | null {
  if (!data) return null;
  if (data?.merchant?._id) return String(data.merchant._id);
  if (data?.merchantId) return String(data.merchantId);
  if (typeof data?.merchant === "string") return data.merchant;
  if (typeof data?.merchant === "object" && data?.merchant?._id) return String(data.merchant._id);
  const sf = data?.store || data?.storefront;
  if (sf?.merchant?._id) return String(sf.merchant._id);
  if (typeof sf?.merchant === "string") return sf.merchant;
  return null;
}

export function useStoreData(slug: string | undefined, isDemo: boolean, onError?: (e: any) => void) {
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
          mid = pub?.merchant?.id || pub?.merchant?._id || pub?.merchantId || null;
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
        setBrandVars((sf as any)?.brandDark || "#111827");

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
          setOffers(off as any);
        } finally {
          if (mounted) setOffersLoading(false);
        }
      } catch (e: any) {
        setError(e?.message || "فشل تحميل بيانات المتجر");
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
