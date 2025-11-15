// src/features/prompt-studio/hooks.ts

import { useCallback, useEffect, useState } from "react";
import type { UseFormReset, UseFormWatch } from "react-hook-form";
import { useErrorHandler } from "@/shared/errors";
import { promptApi } from "./api";
import { areEqualQuickConfigs, type QuickConfig } from "./types";

type Args = {
  token?: string | null;
  merchantId?: string | null;
  activeTab: "quick" | "advanced";
  reset: UseFormReset<QuickConfig>;
  watch: UseFormWatch<QuickConfig>;
};

const clampInstructions = (list: (string | undefined)[] | undefined) =>
  (list ?? [])
    .map((s) => (s ?? "").toString().trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((s) => s.slice(0, 80));

export function usePromptStudio({
  token,
  merchantId,
  activeTab,
  reset,
  watch,
}: Args) {
  const safeToken = token ?? "";
  const safeMerchant = merchantId ?? "";
  const { handleError } = useErrorHandler();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [advancedTemplate, setAdvancedTemplate] = useState<string>("");
  const [previewContent, setPreviewContent] = useState<string>("");

  // initial fetch
  useEffect(() => {
    if (!safeToken || !safeMerchant) return;
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const [quickConfig, advTemplate] = await Promise.all([
          promptApi.getQuickConfig(safeToken, safeMerchant),
          promptApi.getAdvancedTemplate(safeToken, safeMerchant),
        ]);
        if (!mounted) return;
  
        // اضبط نموذج الفورم
        reset({
          dialect: quickConfig?.dialect ?? "خليجي",
          tone: quickConfig?.tone ?? "ودّي",
          customInstructions: clampInstructions(quickConfig?.customInstructions ?? []),
          includeClosingPhrase: !!quickConfig?.includeClosingPhrase,
          closingText: quickConfig?.closingText ?? "هل أقدر أساعدك بشي ثاني؟ 😊",
          customerServicePhone: (quickConfig?.customerServicePhone ?? "").trim(),
          customerServiceWhatsapp: (quickConfig?.customerServiceWhatsapp ?? "").trim(),
        });
  
        // محرّر القالب: لو فاضي، اطلب اقتراح من السيرفر
        let effectiveTemplate = advTemplate ?? "";
        if (!effectiveTemplate) {
          const fallback = await promptApi.getAdvancedTemplateSuggested(
            safeToken,
            safeMerchant,
            quickConfig // نمرر التكوين الحالي للمزيد من الدقة
          );
          effectiveTemplate = fallback.template || "";
        }
        setAdvancedTemplate(effectiveTemplate);
  
        // === أهم سطرين: ابدأ المعاينة من /preview (بدون حارس للتاجر) ===
        const quickForPreview = {
          dialect: quickConfig?.dialect || "خليجي",
          tone: quickConfig?.tone || "ودّي",
          customInstructions: clampInstructions(quickConfig?.customInstructions),
          includeClosingPhrase: !!quickConfig?.includeClosingPhrase,
          closingText: quickConfig?.closingText || "هل أقدر أساعدك بشي ثاني؟ 😊",
          customerServicePhone: (quickConfig?.customerServicePhone || "").trim(),
          customerServiceWhatsapp: (quickConfig?.customerServiceWhatsapp || "").trim(),
        } as QuickConfig;
  
        const initialPreview =
          // إن كنت على تبويب "advanced" اعرض previewAdvanced وإلا previewQuick
          (activeTab === "advanced")
            ? await promptApi.previewAdvanced(safeToken, safeMerchant, quickForPreview)
            : await promptApi.previewQuick(safeToken, safeMerchant, quickForPreview);
  
        console.log("Initial preview result:", initialPreview); // للتشخيص
        setPreviewContent(initialPreview || "لا يوجد محتوى للعرض");
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading prompt studio data:", error);
        handleError(error);
        setPreviewContent("خطأ في تحميل البيانات");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [safeToken, safeMerchant, reset, activeTab]);
  // live preview (quick)
  useEffect(() => {
    if (!safeToken || !safeMerchant) return;
    if (activeTab !== "quick") return;

    let lastValues: QuickConfig | null = null;
    const sub = watch((values) => {
      const safeValues: QuickConfig = {
        dialect: values?.dialect || "خليجي",
        tone: values?.tone || "ودّي",
        customInstructions: clampInstructions(values?.customInstructions ?? []),
        includeClosingPhrase: !!values?.includeClosingPhrase,
        closingText: values?.closingText || "هل أقدر أساعدك بشي ثاني؟ 😊",
        customerServicePhone: (values?.customerServicePhone || "").trim(),
        customerServiceWhatsapp: (values?.customerServiceWhatsapp || "").trim(),
      };

      if (lastValues && areEqualQuickConfigs(safeValues, lastValues)) return;
      lastValues = safeValues;

      const id = setTimeout(async () => {
        try {
          const preview = await promptApi.previewQuick(
            safeToken,
            safeMerchant,
            safeValues
          );
          console.log("Live preview result:", preview); // للتشخيص
          setPreviewContent(preview || "لا يوجد محتوى للعرض");
          setLastUpdated(new Date());
        } catch (error) {
          console.error("Error in live preview:", error);
          handleError(error);
          setPreviewContent("خطأ في المعاينة الحية");
        }
      }, 500);

      return () => clearTimeout(id);
    });

    return () => sub.unsubscribe();
  }, [safeToken, safeMerchant, activeTab, watch]);

  // manual preview for toolbar refresh (quick/advanced)
  const handleManualPreview = useCallback(async () => {
    if (!safeToken || !safeMerchant) {
      setPreviewContent("غير مصرح");
      return;
    }

    const current = watch();
    const quick: QuickConfig = {
      dialect: current?.dialect || "خليجي",
      tone: current?.tone || "ودّي",
      customInstructions: clampInstructions(current?.customInstructions),
      includeClosingPhrase: !!current?.includeClosingPhrase,
      closingText: current?.closingText || "هل أقدر أساعدك بشي ثاني؟ 😊",
      customerServicePhone: (current?.customerServicePhone || "").trim(),
      customerServiceWhatsapp: (current?.customerServiceWhatsapp || "").trim(),
    };

    try {
      const preview =
        activeTab === "advanced"
          ? await promptApi.previewAdvanced(safeToken, safeMerchant, quick)
          : await promptApi.previewQuick(safeToken, safeMerchant, quick);

      setPreviewContent(preview);
      setLastUpdated(new Date());
    } catch (error) {
      handleError(error);
      setPreviewContent("خطأ في جلب المعاينة من الخادم");
    }
  }, [safeToken, safeMerchant, activeTab, watch]);

  // save quick
  const handleSaveQuickConfig = useCallback(
    async (data: QuickConfig) => {
      if (!safeToken || !safeMerchant) return;
      setIsSaving(true);
      try {
        const payload: QuickConfig = {
          dialect: data.dialect || "خليجي",
          tone: data.tone || "ودّي",
          customInstructions: clampInstructions(data.customInstructions),
          includeClosingPhrase: !!data.includeClosingPhrase,
          closingText: data.closingText || "هل أقدر أساعدك بشي ثاني؟ 😊",
          customerServicePhone: (data.customerServicePhone || "").trim(),
          customerServiceWhatsapp: (data.customerServiceWhatsapp || "").trim(),
        };

        const updated = await promptApi.updateQuickConfig(
          safeToken,
          safeMerchant,
          payload
        );
        // sync form with server response (مع القصّ)
        reset({
          dialect: updated.dialect ?? "خليجي",
          tone: updated.tone ?? "ودّي",
          customInstructions: clampInstructions(updated.customInstructions),
          includeClosingPhrase: updated.includeClosingPhrase ?? true,
          closingText: updated.closingText ?? "هل أقدر أساعدك بشي ثاني؟ 😊",
          customerServicePhone: updated.customerServicePhone ?? "",
          customerServiceWhatsapp: updated.customerServiceWhatsapp ?? "",
        });
        setLastUpdated(new Date());
      } catch (error) {
        handleError(error);
      } finally {
        setIsSaving(false);
      }
    },
    [safeToken, safeMerchant, reset]
  );

  // save advanced
  const handleSaveAdvancedTemplate = useCallback(async () => {
    if (!safeToken || !safeMerchant) return;
    setIsSaving(true);
    try {
      await promptApi.saveAdvancedTemplate(
        safeToken,
        safeMerchant,
        advancedTemplate,
        "تعديل يدوي"
      );
      setLastUpdated(new Date());
      await handleManualPreview();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  }, [safeToken, safeMerchant, advancedTemplate, handleManualPreview]);

  return {
    isLoading,
    isSaving,
    lastUpdated,
    previewContent,
    advancedTemplate,
    setAdvancedTemplate,
    handleManualPreview,
    handleSaveQuickConfig,
    handleSaveAdvancedTemplate,
  };
}
