import { useEffect, useState } from "react";
import axiosInstance from "@/shared/api/axios";
import { fetchOrderById, fetchMerchantById } from "../api";
import { getStorefrontInfo } from "@/features/mechant/storefront-theme/api";
import { setBrandVars } from "@/features/shared/brandCss";
import type { Order } from "@/features/store/type";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";

const unwrap = (x: any) => x?.data?.data ?? x?.data ?? x;

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
          // طبّق البراند من متجر الديمو
          const sfRes = await axiosInstance.get(`/storefront/${slug}`);
          const m = unwrap(sfRes)?.merchant ?? sfRes?.data?.merchant;
          if (m?._id && mounted) {
            setMerchant(m);
            try {
              const info = await getStorefrontInfo(m._id);
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
        const m = await fetchMerchantById(order.merchantId as any);
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
