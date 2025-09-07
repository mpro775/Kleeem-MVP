// src/features/mechant/storefront-theme/hooks.ts
import { useEffect, useMemo, useState } from "react";
import { getStorefrontInfo, updateStorefrontInfo } from "./api"; // لا نحتاج checkSlug
import type { Storefront } from "./type";
import { getMerchantInfo } from "@/features/mechant/merchant-settings/api"; // لجلب publicSlug
import { DEFAULT_BRAND_DARK } from "@/features/shared/allowedBrandPalette";
import { setBrandVars } from "@/features/shared/brandCss";

export function useStorefrontTheme(merchantId: string) {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [initial, setInitial] = useState<Storefront | null>(null);

  // 🎨 المظهر
  const [brandDark, setBrandDark] = useState<string>(DEFAULT_BRAND_DARK);
  const [buttonStyle, setButtonStyle] = useState<"rounded" | "square">("rounded");

  // 🌐 الربط/العرض فقط
  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined); // قراءة فقط
  const [domain, setDomain] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    Promise.all([
      getStorefrontInfo(merchantId), // ألوان/مظهر/دومين
      getMerchantInfo(merchantId),   // publicSlug
    ])
      .then(([sf, merchant]) => {
        setInitial(sf);
        setBrandDark(sf?.brandDark ?? DEFAULT_BRAND_DARK); // لا داعي لـ (as any)
        setButtonStyle(sf?.buttonStyle ?? "rounded");
        setDomain(sf?.domain);
        // ✅ قبل: merchant.data.publicSlug — بعد: merchant.publicSlug
        setPublicSlug(merchant.publicSlug);
      })
      .catch((e) => {
        setSnackbar({
          open: true,
          message: e?.message || "فشل تحميل إعدادات الواجهة",
          severity: "error",
        });
      })
      .finally(() => setLoading(false));
  }, [merchantId]);

  // تطبيق المتغيّرات (معاينة فورية)
  useEffect(() => {
    setBrandVars(brandDark || DEFAULT_BRAND_DARK);
  }, [brandDark]);

  // رابط المتجر المبني على السلاج الموحّد (قراءة فقط) أو الدومين إن وُجد
  const storeUrl = useMemo(() => {
    if (domain) return `https://${domain}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return publicSlug ? `${origin}/store/${publicSlug}` : ""; // ✔️ بدل /{slug}/store
  }, [domain, publicSlug]);

  // حفظ التغييرات (بدون أي تعديل للسلاج هنا)
  const handleSave = async () => {
    try {
      setSaveLoading(true);
      const payload: Partial<Storefront> = {};
      if ((brandDark ?? DEFAULT_BRAND_DARK) !== (initial?.brandDark ?? DEFAULT_BRAND_DARK)) {
        (payload as any).brandDark = brandDark;
      }
      if (buttonStyle !== initial?.buttonStyle) {
        payload.buttonStyle = buttonStyle;
      }

      if (Object.keys(payload).length === 0) {
        setSnackbar({ open: true, message: "لا توجد تغييرات للحفظ", severity: "success" });
        setSaveLoading(false);
        return;
      }

      const updated = await updateStorefrontInfo(merchantId, payload);
      setInitial(updated);
      setSnackbar({ open: true, message: "تم حفظ الإعدادات", severity: "success" });
    } catch (e: unknown) {
      setSnackbar({
        open: true,
        message: e instanceof Error ? e.message : "فشل حفظ الإعدادات",
        severity: "error",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const closeSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  return {
    loading,
    saveLoading,
    snackbar,
    closeSnackbar,

    // قيم العرض/التحكم
    brandDark,
    setBrandDark,
    buttonStyle,
    setButtonStyle,

    // 🔒 للسلاج الموحّد (عرض فقط)
    publicSlug,
    domain,
    storeUrl,

    handleSave,
  };
}
