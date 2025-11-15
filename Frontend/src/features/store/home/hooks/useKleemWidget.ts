// =========================
// File: src/features/store/hooks/useKleemWidget.ts
// =========================
import { useEffect, useState } from "react";
import { API_BASE } from "@/context/config";
import type { MerchantInfo, Storefront } from "../types";
import { fetchWidgetSettings } from "@/features/mechant/widget-config/api";
import { isMockDataEnabled } from "@/mock-data";

export function useKleemWidget(
  merchant: MerchantInfo | null,
  storefront: Storefront | null
) {
  const [widgetSettings, setWidgetSettings] = useState<any>(null);

  // جلب إعدادات الويدجت
  useEffect(() => {
    if (!merchant?._id) return;
    
    fetchWidgetSettings(merchant._id)
      .then((settings) => {
        setWidgetSettings(settings);
      })
      .catch((err) => {
        console.warn("Failed to fetch widget settings:", err);
        setWidgetSettings(null);
      });
  }, [merchant?._id]);

  useEffect(() => {
    if (!merchant || !storefront) return;

    const existing = document.getElementById(
      "kleem-chat"
    ) as HTMLScriptElement | null;

    // استخدام لون البراند من storefront مباشرة (الأولوية للبراند الخاص بالمتجر)
    // ثم استخدام إعدادات الويدجت كـ fallback
    const brandColor = storefront.brandDark || widgetSettings?.brandColor || "#111827";
    const fontFamily = widgetSettings?.fontFamily || "Tajawal";
    const botName = widgetSettings?.botName || "مساعد ذكي";
    const welcomeMessage = widgetSettings?.welcomeMessage || "مرحباً! كيف يمكنني مساعدتك؟";

    console.log("[useKleemWidget] Brand color:", brandColor, "from storefront:", storefront.brandDark);

    // في demo mode، استخدم relative URL للـ API
    const apiBaseUrl = isMockDataEnabled() 
      ? window.location.origin + "/api" 
      : API_BASE;

    const cfg = {
      merchantId: merchant._id,
      apiBaseUrl,
      mode: "bubble", // ✅ زر خفيف (فقاعة) بدل نموذج عشوائي على الشاشة
      brandColor,
      headerBgColor: brandColor,
      bodyBgColor: "#FFFFFF",
      fontFamily,
      botName,
      welcomeMessage,
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
        console.log("[useKleemWidget] Created new widget script with brandColor:", brandColor);
      } else {
        try {
          const current = JSON.parse(existing.getAttribute("data-config") || "{}");
          const updated = { ...current, ...cfg };
          existing.setAttribute("data-config", JSON.stringify(updated));
          console.log("[useKleemWidget] Updated widget config with brandColor:", brandColor);
          
          // إعادة تحميل الويدجت إذا تغير brandColor
          if (current.brandColor !== brandColor && (window as any)?.KleemWidget?.destroy) {
            console.log("[useKleemWidget] Brand color changed, reloading widget...");
            (window as any).KleemWidget.destroy();
            // إعادة إنشاء السكربت بعد تدمير القديم
            setTimeout(() => {
              const newScript = document.createElement("script");
              newScript.id = "kleem-chat";
              newScript.async = true;
              newScript.src = widgetUrl;
              newScript.setAttribute("data-config", JSON.stringify(cfg));
              document.body.appendChild(newScript);
            }, 100);
          }
        } catch {
          existing.setAttribute("data-config", JSON.stringify(cfg));
          console.log("[useKleemWidget] Updated widget config (fallback) with brandColor:", brandColor);
        }
      }
    }, [merchant, storefront, widgetSettings]);
  }
