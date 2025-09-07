import { useEffect, useState } from "react";
import { fetchProductById } from "@/features/store/product/api";
import axiosInstance from "@/shared/api/axios";
import { getStorefrontInfo } from "@/features/mechant/storefront-theme/api";
import { setBrandVars } from "@/features/shared/brandCss";
import type { ProductResponse } from "@/features/mechant/products/type";

const unwrap = (x: any) => x?.data?.data ?? x?.data ?? x;

export function useProductDetails(productId?: string, slug?: string) {
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // تطبيق لون البراند حتى لو دخل من رابط مباشر
  useEffect(() => {
    if (!slug) return;
    axiosInstance
      .get(`/storefront/${slug}`)
      .then(async (res) => {
        try {
          const merchantId =
            res?.data?.merchant?._id || res?.data?.data?.merchant?._id;
          if (merchantId) {
            const sf = await getStorefrontInfo(merchantId as string);
            setBrandVars((sf as any)?.brandDark || "#111827");
          } else setBrandVars("#111827");
        } catch {
          setBrandVars("#111827");
        }
      })
      .catch(() => setBrandVars("#111827"));
  }, [slug]);

  // جلب المنتج
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (!productId) throw new Error("productId مفقود");
        const prod = (await fetchProductById(
          productId
        )) as ProductResponse | null;
        if (!mounted) return;
        setProduct(prod?._id ? prod : null);
      } catch {
        if (!mounted) return;
        setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [productId]);

  return { product, loading };
}
