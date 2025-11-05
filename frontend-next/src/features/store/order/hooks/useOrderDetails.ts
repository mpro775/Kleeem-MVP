// =========================
// File: src/features/store/hooks/useOrderDetails.ts
// =========================
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import { fetchOrderById, fetchMerchantById } from "../api";
import { getStorefrontInfo } from "@/features/merchant/storefront-theme/api";
import { setBrandVars } from "@/features/shared/brandCss";
import type { Order } from "@/features/store/type";
import type { MerchantInfo } from "@/features/merchant/merchant-settings/types";
import type { StorefrontEnvelope } from "@/shared/types/api";
import { pickId } from "@/shared/types/api";

export function useOrderDetails(orderId?: string, slug?: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemo = slug === "demo";

  // 1) جلب الطلب (يدعم الديمو)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (!orderId) return;

        if (isDemo && orderId.startsWith("DEMO-")) {
          const raw = localStorage.getItem("kleem:lastDemoOrder");
          if (raw && mounted) setOrder(JSON.parse(raw));

          // متجر الديمو → نحصل على merchantId من الرد الموحّد
          if (!slug) return;
          const { data: sf } = await axiosInstance.get<StorefrontEnvelope>(`/storefront/${encodeURIComponent(slug)}`);

          const mid =
            pickId(sf?.merchant) ??
            pickId(sf?.storefront?.merchant) ??
            pickId(sf?.store?.merchant);

          if (mid && mounted) {
            // يكفي الـ _id لطلب معلومات الواجهة وتطبيق ألوان العلامة
            try {
              const info = await getStorefrontInfo(mid);
              setBrandVars(info?.brandDark || "#111827");
            } catch {
              setBrandVars("#111827");
            }
          }
        } else {
          // طلب حقيقي
          const o = await fetchOrderById(orderId);
          if (!mounted) return;
          setOrder(o);
        }
      } catch {
        if (mounted) setOrder(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orderId, isDemo, slug]);

  // 2) جلب التاجر وتطبيق لون البراند (للواقع)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isDemo) return;
        if (!order?.merchantId) return;

        const m = await fetchMerchantById(order.merchantId);
        if (!mounted) return;
        setMerchant(m);

        try {
          const info = await getStorefrontInfo(m._id);
          setBrandVars(info?.brandDark || "#111827");
        } catch {
          setBrandVars("#111827");
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [order?.merchantId, isDemo]);

  return { order, merchant, loading };
}
