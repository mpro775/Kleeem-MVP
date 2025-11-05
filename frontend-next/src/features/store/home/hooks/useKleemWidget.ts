// =========================
// File: src/features/store/hooks/useKleemWidget.ts
// =========================
import { useEffect } from "react";
import { API_BASE } from "@/context/config";
import type { MerchantInfo, Storefront } from "../types";

export function useKleemWidget(
  merchant: MerchantInfo | null,
  storefront: Storefront | null
) {
  useEffect(() => {
    if (!merchant || !storefront) return;

    const existing = document.getElementById(
      "kleem-chat"
    ) as HTMLScriptElement | null;

    const cfg = {
      merchantId: merchant._id,
      apiBaseUrl: API_BASE,
      mode: "bubble", // ✅ زر خفيف (فقاعة) بدل نموذج عشوائي على الشاشة
      brandColor: storefront.brandDark,
      headerBgColor: storefront.brandDark,
      bodyBgColor: "#FFFFFF",
      fontFamily: "Tajawal",
      publicSlug: (merchant as unknown as { publicSlug: string })?.publicSlug,
    };
    const host =
      (import.meta?.env?.VITE_PUBLIC_WIDGET_HOST as string | undefined) ??
      window.location.origin;
      const widgetUrl = `${host.replace(/\/+$/, "")}/widget.js`;

      if (!existing) {
        const script = document.createElement("script");
        script.id = "kleem-chat";
        script.async = true;
        script.src = widgetUrl;
        script.setAttribute("data-config", JSON.stringify(cfg));
        document.body.appendChild(script);
      } else {
        try {
          const current = JSON.parse(existing.getAttribute("data-config") || "{}");
          existing.setAttribute("data-config", JSON.stringify({ ...current, ...cfg }));
          // لو سكربت الويجت يدعم إعادة التحميل/التحديث، نادِ API داخل الويجت (اختياري)
          // (window as any)?.KleemWidget?.update?.(cfg);
        } catch {
          existing.setAttribute("data-config", JSON.stringify(cfg));
        }
      }
    }, [merchant, storefront]);
  }
