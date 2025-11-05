import { useEffect, useState } from "react";
import type { MerchantInfo } from '../types';
import { fetchStorefront, fetchStorefrontInfo } from "../api";
import { setBrandVars } from "@/features/shared/brandCss";

const unwrap = (x: unknown) => (x as { data?: { data?: unknown } }).data?.data ?? (x as { data?: unknown }).data ?? x;

export function useAboutData(slugOrId: string) {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        if (!slugOrId) throw new Error("لا يوجد مُعرّف متجر في المسار.");

        const data = await fetchStorefront(slugOrId);
        const m: MerchantInfo | null =
          (data as { merchant?: MerchantInfo; data?: { merchant?: MerchantInfo } })?.merchant ?? (data as { data?: { merchant?: MerchantInfo } })?.data?.merchant ?? null;
        if (!m?._id) throw new Error("تعذر استخراج بيانات التاجر.");

        if (!mounted) return;
        setMerchant(m);

        // ألوان البراند
        try {
          const info = await fetchStorefrontInfo(m._id);
          const brandDark = (unwrap(info) as { brandDark?: string })?.brandDark || "#111827";
          setBrandVars(brandDark);
        } catch {
          setBrandVars("#111827");
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setErr((e as Error)?.message || "تعذر تحميل معلومات المتجر");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slugOrId]);

  return { merchant, loading, err };
}
