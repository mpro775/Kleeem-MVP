// src/pages/Dashboard/ChatWidgetConfigSinglePage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  IconButton,
  CardContent,
  Alert,
  Tooltip,
  CircularProgress,
  Snackbar,
  useTheme,
} from "@mui/material";
import {
  ContentCopy,
  CheckCircle,
  Palette,
  Settings as SettingsIcon,
  Code,
  Visibility,
  Edit,
  Save,
  Cancel,
} from "@mui/icons-material";
import { useAuth } from "@/context/AuthContext";

import SectionCard from "@/features/mechant/widget-config/ui/SectionCard";
import { BrandSwatches } from "@/features/mechant/storefront-theme/ui/BrandSwatches";
import PreviewPane from "@/features/mechant/widget-config/ui/PreviewPane";

import { API_BASE } from "@/context/config";
import type {
  EmbedMode,
  SettingsView,
  ChatWidgetSettings,
} from "@/features/mechant/widget-config/types";
import { useWidgetSettings } from "@/features/mechant/widget-config/model";
import { saveWidgetSettings } from "@/features/mechant/widget-config/api";
import {
  buildChatLink,
  buildEmbedScript,
} from "@/features/mechant/widget-config/utils";
import { getMerchantInfo } from "@/features/mechant/merchant-settings/api";

const ALLOWED_BRAND_DARK = [
  "#111827", // slate
  "#1f2937", // charcoal
  "#0b1f4b", // navy
  "#1e1b4b", // indigo
  "#3b0764", // purple
  "#134e4a", // teal
  "#064e3b", // emerald
  "#14532d", // forest
  "#4a0e0e", // maroon
  "#3e2723", // chocolate
] as const;

export default function ChatWidgetConfigSinglePage() {
  const theme = useTheme();
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";
  const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
  const WIDGET_HOST = ORIGIN;

  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined);

  const {
    data: serverSettings,
    loading,
    error,
  } = useWidgetSettings(merchantId);

  const [settings, setSettings] = useState<SettingsView>({
    botName: "Musaid Bot",
    welcomeMessage: "",
    brandColor: ALLOWED_BRAND_DARK[0],
    widgetSlug: "",
    fontFamily: "Tajawal",
    headerBgColor: undefined as any,
    bodyBgColor: undefined as any,
    embedMode: "bubble",
    shareUrl: `${ORIGIN}/chat/`,
  });

  const [draft, setDraft] = useState<SettingsView | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // حمّل إعدادات السيرفر
  useEffect(() => {
    if (!serverSettings) return;
    setSettings((prev) => ({
      ...prev,
      ...serverSettings,
      brandColor: serverSettings.brandColor || prev.brandColor,
      headerBgColor: undefined as any,
      bodyBgColor: undefined as any,
    }));
  }, [serverSettings]);

  // حمّل publicSlug
  useEffect(() => {
    if (!merchantId) return;
    getMerchantInfo(merchantId)
      .then((info) => setPublicSlug(info.publicSlug))
      .catch(() => setPublicSlug(undefined));
  }, [merchantId]);

  const effective = draft ?? settings;

  // فرض اللون ضمن المسموح
  const safeBrand = (ALLOWED_BRAND_DARK as readonly string[]).includes(
    effective.brandColor ?? ""
  )
    ? (effective.brandColor as string)
    : ALLOWED_BRAND_DARK[0];

  const embedTag = useMemo(
    () =>
      buildEmbedScript({
        merchantId,
        apiBaseUrl: API_BASE,
        mode: effective.embedMode,
        brandColor: safeBrand,
        welcomeMessage: effective.welcomeMessage,
        fontFamily: effective.fontFamily,
        publicSlug,
        widgetHost: WIDGET_HOST,
      }),
    [
      merchantId,
      effective.embedMode,
      effective.welcomeMessage,
      effective.brandColor,
      effective.fontFamily,
      publicSlug,
      WIDGET_HOST,
    ]
  );

  const chatLink = useMemo(
    () => (publicSlug ? buildChatLink(ORIGIN, publicSlug) : "—"),
    [ORIGIN, publicSlug]
  );

  const handleChange = <K extends keyof SettingsView>(
    key: K,
    value: SettingsView[K]
  ) => {
    if (draft) setDraft((d) => ({ ...d!, [key]: value }));
    else setSettings((s) => ({ ...s, [key]: value }));
  };

  const startEdit = () => setDraft({ ...settings });
  const cancelEdit = () => setDraft(null);

  const saveAll = async () => {
    if (!draft || !merchantId) return;
    setApiError(null);
    try {
      const dto: ChatWidgetSettings = {
        botName: draft.botName,
        brandColor: safeBrand,
        welcomeMessage: draft.welcomeMessage,
        fontFamily: draft.fontFamily,
      };
      await saveWidgetSettings(merchantId, dto);
      setSettings({ ...draft, brandColor: safeBrand });
      setDraft(null);
      setShowSuccess(true);
    } catch {
      setApiError("فشل حفظ الإعدادات. حاول مجددًا.");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!merchantId) {
    return (
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Alert severity="warning">لا يوجد تاجر مسجّل.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>جاري التحميل…</Typography>
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        maxWidth: 1400,
        mx: "auto",
        p: { xs: 2, md: 4 },
        minHeight: "100vh",
        bgcolor: "#fafafa",
      }}
    >
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        message="تم حفظ التغييرات بنجاح"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {apiError}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          فشل جلب الإعدادات من الخادم.
        </Alert>
      )}

      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h4" fontWeight={800}>
          إعدادات الدردشة
        </Typography>
        {!draft ? (
          <Button variant="contained" startIcon={<Edit />} onClick={startEdit}>
            تعديل الإعدادات
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={cancelEdit}
            >
              إلغاء
            </Button>
            <Button variant="contained" startIcon={<Save />} onClick={saveAll}>
              حفظ التغييرات
            </Button>
          </Stack>
        )}
      </Box>

      {/* محتوى بعمودين */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 16 / 2,
        }}
      >
        {/* العمود الأيسر */}
        <Box>
          <Stack spacing={2}>
            <SectionCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <SettingsIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    الإعدادات العامة
                  </Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    label="اسم البوت"
                    fullWidth
                    value={effective.botName ?? ""}
                    onChange={(e) => handleChange("botName", e.target.value)}
                  />
                  <TextField
                    label="الرسالة الترحيبية"
                    fullWidth
                    multiline
                    rows={3}
                    value={effective.welcomeMessage ?? ""}
                    onChange={(e) =>
                      handleChange("welcomeMessage", e.target.value)
                    }
                  />
                </Stack>
              </CardContent>
            </SectionCard>

            <SectionCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <Palette color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    المظهر والتنسيق
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ mb: 2 }}
                  color="text.secondary"
                >
                  يتم استخدام لون واحد داكن فقط في الويب شات. الخلفية تبقى
                  بيضاء.
                </Typography>

                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>نوع الخط</InputLabel>
                    <Select
                      value={effective.fontFamily ?? "Tajawal"}
                      label="نوع الخط"
                      onChange={(e) =>
                        handleChange("fontFamily", e.target.value)
                      }
                    >
                      <MenuItem value="Tajawal">Tajawal</MenuItem>
                      <MenuItem value="Inter">Inter</MenuItem>
                      <MenuItem value="Roboto">Roboto</MenuItem>
                      <MenuItem value="Arial">Arial</MenuItem>
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      اللون الموحّد:
                    </Typography>
                    <BrandSwatches
                      value={safeBrand}
                      onChange={(hex) => handleChange("brandColor", hex)}
                      allowed={ALLOWED_BRAND_DARK as unknown as string[]}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </SectionCard>

            <SectionCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Code color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    خيارات التضمين
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>وضع التضمين</InputLabel>
                    <Select
                      value={effective.embedMode}
                      label="وضع التضمين"
                      onChange={(e) =>
                        handleChange("embedMode", e.target.value as EmbedMode)
                      }
                    >
                      <MenuItem value="bubble">فقاعة عائمة</MenuItem>
                      <MenuItem value="iframe">إطار مدمج</MenuItem>
                      <MenuItem value="bar">شريط سفلي</MenuItem>
                      <MenuItem value="conversational">محادثة كاملة</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="رابط المشاركة"
                    fullWidth
                    value={publicSlug ? `${ORIGIN}/chat/${publicSlug}` : "—"}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="رابط صفحة الدردشة (slug)"
                    fullWidth
                    value={publicSlug ?? ""}
                    InputProps={{ readOnly: true }}
                  />

                  {/* رابط الدردشة */}
                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        رابط الدردشة
                      </Typography>
                      <Tooltip title={copied ? "تم النسخ!" : "نسخ الرابط"}>
                        <IconButton
                          size="small"
                          onClick={() => copy(chatLink)}
                          color={copied ? "success" : "default"}
                        >
                          {copied ? <CheckCircle /> : <ContentCopy />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <TextField
                      value={chatLink}
                      InputProps={{ readOnly: true }}
                    />
                  </Box>

                  {/* كود التضمين */}
                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        كود التضمين
                      </Typography>
                      <Tooltip title={copied ? "تم النسخ!" : "نسخ الكود"}>
                        <IconButton
                          size="small"
                          onClick={() => copy(embedTag)}
                          color={copied ? "success" : "default"}
                        >
                          {copied ? <CheckCircle /> : <ContentCopy />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      value={embedTag}
                      InputProps={{ readOnly: true }}
                      sx={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: ".85rem",
                        bgcolor: theme.palette.grey[100],
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </SectionCard>
          </Stack>
        </Box>

        {/* العمود الأيمن — المعاينة */}
        <Box>
          <SectionCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Visibility color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  معاينة الدردشة
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: { xs: 420, md: 560 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  overflow: "hidden",
                  bgcolor: "#fff",
                }}
              >
                <PreviewPane embedTag={embedTag} />
              </Box>
            </CardContent>
          </SectionCard>
        </Box>
      </Box>
    </Box>
  );
}
