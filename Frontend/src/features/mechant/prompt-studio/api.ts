// src/features/prompt-studio/api.ts

import type { PreviewPromptDto, PreviewResponse, QuickConfig } from "./types";
import { API_BASE } from "@/context/config";
import axiosInstance from "@/shared/api/axios";


const authHeader = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

function extractPreview(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "preview" in data) {
    const val = (data as { preview?: unknown }).preview;
    return typeof val === "string" ? val : "";
  }
  return "";
}
export async function getAdvancedTemplate(
  token: string,
  merchantId: string
): Promise<string> {
  const res = await axiosInstance.get<{ template: string; note?: string }>(
    `${API_BASE}/merchants/${merchantId}/prompt/advanced-template`,
    authHeader(token)
  );
  return res.data?.template ?? "";
}

// حفظ الـAdvancedTemplate
export async function saveAdvancedTemplate(
  token: string,
  merchantId: string,
  template: string,
  note?: string
): Promise<void> {
  await axiosInstance.post(
    `${API_BASE}/merchants/${merchantId}/prompt/advanced-template`,
    { template, note }, // ← تصحيح
    authHeader(token)
  );
}
export async function getQuickConfig(
  token: string,
  merchantId: string
): Promise<QuickConfig> {
  const res = await axiosInstance.get<QuickConfig>(
    `${API_BASE}/merchants/${merchantId}/prompt/quick-config`,
    authHeader(token)
  );
  return res.data;
}
export async function previewPrompt(
  token: string,
  merchantId: string,
  dto: PreviewPromptDto
): Promise<string> {
  try {
    const res = await axiosInstance.post<PreviewResponse>(
      `${API_BASE}/merchants/${merchantId}/prompt/preview`,
      {
        quickConfig: {
          dialect: dto.quickConfig?.dialect || "خليجي",
          tone: dto.quickConfig?.tone || "ودّي",
          customInstructions: dto.quickConfig?.customInstructions || [],
          includeClosingPhrase: dto.quickConfig?.includeClosingPhrase ?? true,
          closingText: dto.quickConfig?.closingText || "هل أقدر أساعدك بشي ثاني؟ 😊",
          customerServicePhone: dto.quickConfig?.customerServicePhone?.trim(),
          customerServiceWhatsapp: dto.quickConfig?.customerServiceWhatsapp?.trim(),
        },
        useAdvanced: !!dto.useAdvanced, // ← ضمان Boolean
        testVars:
          dto.testVars && Object.keys(dto.testVars).length
            ? dto.testVars
            : { productName: "هاتف ذكي", customerName: "أحمد محمد" }, // ← افتراضي يمنع 400
      },
      {
        ...authHeader(token),
        headers: {
          ...authHeader(token).headers,
          "Content-Type": "application/json", // ← تأكيد JSON
        },
      }
    );
    return extractPreview(res.data);
  } catch (error) {
    console.error("Error in previewPrompt:", error);
    throw error;
  }
}


// src/api/merchantsApi.ts
export async function getFinalPrompt(
  token: string,
  merchantId: string,
): Promise<string> {
  const res = await axiosInstance.get<{ prompt: string }>(
    `${API_BASE}/merchants/${merchantId}/prompt/final-prompt`,
    authHeader(token),
  );
  return res.data.prompt;
}
// تحديث الـQuickConfig
export async function updateQuickConfig(
  token: string,
  merchantId: string,
  config: QuickConfig
): Promise<QuickConfig> {
  const res = await axiosInstance.patch<QuickConfig>(
    `${API_BASE}/merchants/${merchantId}/prompt/quick-config`,
    config,
    authHeader(token)
  );
  return res.data;
}
const DEFAULT_TEST_VARS = {
  productName: "هاتف ذكي",
  customerName: "أحمد محمد",
};

// توحيد الشكل الداخل/الخارج
const mapToMerchantQuickConfig = (q: QuickConfig): QuickConfig => ({
  dialect: q.dialect,
  tone: q.tone,
  customInstructions: Array.isArray(q.customInstructions)
    ? q.customInstructions
    : [],
  includeClosingPhrase: q.includeClosingPhrase,
  closingText: q.closingText,
  customerServicePhone: q.customerServicePhone,
  customerServiceWhatsapp: q.customerServiceWhatsapp,
});

const mapFromMerchantQuickConfig = (q: QuickConfig): QuickConfig => ({
  dialect: q.dialect,
  tone: q.tone,
  customInstructions: Array.isArray(q.customInstructions)
    ? q.customInstructions
    : [],
  includeClosingPhrase: !!q.includeClosingPhrase,
  closingText: q.closingText,
  customerServicePhone: q.customerServicePhone,
  customerServiceWhatsapp: q.customerServiceWhatsapp,
});

// ====== غلاف (Wrapper) لدعوة المعاينة مع دعم audience محليًا ======
type PreviewBody = {
  quickConfig?: Partial<QuickConfig>;
  useAdvanced: boolean;
  testVars: Record<string, string>;
  audience?: "merchant" | "agent";
};

async function postPreview(
  token: string,
  merchantId: string,
  body: PreviewBody
): Promise<string> {
  // نمرّر body كـ any لتجاوز فروق التعريفات إن كانت النسخة القديمة لا تحتوي audience
  const res: unknown = await previewPrompt(
    token,
    merchantId,
    body as unknown as PreviewPromptDto
  );
  // الباك إند يرسل الآن: { success, data: string, requestId, timestamp }
  return typeof res === "string" ? res : "";
}

// اقتراح قالب متقدم عند عدم وجوده في الخادم
async function getAdvancedTemplateSuggested(
  token: string,
  merchantId: string,
  quickConfig?: Partial<QuickConfig>
): Promise<{ template: string }> {
  const template = await postPreview(token, merchantId, {
    quickConfig,
    useAdvanced: true,
    testVars: DEFAULT_TEST_VARS,
    audience: "merchant", // Final بدون أقسام الحارس (مناسب للمحرر)
  });
  return { template };
}

export const promptApi = {
  // QuickConfig
  getQuickConfig: async (token: string, merchantId: string) => {
    const cfg = await getQuickConfig(token, merchantId);
    return mapFromMerchantQuickConfig(cfg);
  },

  updateQuickConfig: async (
    token: string,
    merchantId: string,
    config: QuickConfig
  ) =>
    updateQuickConfig(token, merchantId, mapToMerchantQuickConfig(config)),

  // Final prompt (نص النظام الكامل للاستخدام الداخلي فقط)
  getFinalPrompt,

  // Advanced template (قد يعيد نصًا فارغًا إن لم يُحفظ من قبل)
  getAdvancedTemplate,

  // حفظ القالب المتقدم
  saveAdvancedTemplate,

  // المعاينة (مغلّفة) — توحيد المخرجات كسلسلة نصية
  previewPrompt: postPreview,

  // معاينة سريعة (Quick) — Final للتاجر بدون أقسام الحارس
  previewQuick: (token: string, merchantId: string, quickConfig: QuickConfig) =>
    postPreview(token, merchantId, {
      quickConfig,
      useAdvanced: false,
      testVars: DEFAULT_TEST_VARS,
      audience: "merchant",
    }),

  // معاينة القالب المتقدم — Final للتاجر بدون أقسام الحارس
  previewAdvanced: (
    token: string,
    merchantId: string,
    quickConfig: QuickConfig
  ) =>
    postPreview(token, merchantId, {
      quickConfig,
      useAdvanced: true,
      testVars: DEFAULT_TEST_VARS,
      audience: "merchant",
    }),

  // اقتراح قالب متقدم عند عدم وجود واحد محفوظ
  getAdvancedTemplateSuggested,
};
