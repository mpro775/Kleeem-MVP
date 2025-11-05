'use client';

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

import SectionCard from "@/features/merchant/widget-config/ui/SectionCard";
import { BrandSwatches } from "@/features/merchant/storefront-theme/ui/BrandSwatches";
import PreviewPane from "@/features/merchant/widget-config/ui/PreviewPane";

import type {
  EmbedMode,
  SettingsView,
  ChatWidgetSettings,
} from "@/features/merchant/widget-config/types";
import { useWidgetSettings } from "@/features/merchant/widget-config/hooks";
import { saveWidgetSettings } from "@/features/merchant/widget-config/api";
import {
  buildChatLink,
  buildEmbedScript,
} from "@/features/merchant/widget-config/utils";
import { getMerchantInfo } from "@/features/merchant/merchant-settings/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

// Temporary auth helper
function useMerchantId(): string {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user?.merchantId || '';
      } catch {
        return '';
      }
    }
  }
  return '';
}

export default function ChatWidgetConfigSinglePage() {
  const theme = useTheme();
  const merchantId = useMerchantId();
  const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
  const WIDGET_HOST = ORIGIN;

  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined);

  const {
    data: serverSettings,
    loading,
    error,
  } = useWidgetSettings(merchantId);

  const [draft, setDraft] = useState<SettingsView | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Derive settings from serverSettings
  const settings = useMemo<SettingsView>(() => ({
    botName: serverSettings?.botName || "Musaid Bot",
    welcomeMessage: serverSettings?.welcomeMessage || "",
    brandColor: serverSettings?.brandColor || ALLOWED_BRAND_DARK[0],
    widgetSlug: serverSettings?.widgetSlug || "",
    fontFamily: serverSettings?.fontFamily || "Tajawal",
    headerBgColor: undefined as unknown as string,
    bodyBgColor: undefined as unknown as string,
    embedMode: (serverSettings?.embedMode as EmbedMode) || "bubble",
    shareUrl: `${ORIGIN}/chat/`,
  }), [serverSettings, ORIGIN]);

  useEffect(() => {
    if (!merchantId) return;
    getMerchantInfo(merchantId)
      .then((info) => setPublicSlug(info.publicSlug))
      .catch((e) => {
        console.error(e);
        setPublicSlug(undefined);
      });
  }, [merchantId]);

  const effective = draft ?? settings;

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
      effective.fontFamily,
      publicSlug,
      WIDGET_HOST,
      safeBrand,
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
    if (draft) {
      setDraft((d) => ({ ...d!, [key]: value }));
    } else {
      setDraft({ ...settings, [key]: value });
    }
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
      setDraft(null);
      setShowSuccess(true);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = error?.response?.data?.message || error?.message || "فشل حفظ الإعدادات";
      setApiError(msg);
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
        }}
      >
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
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Box>

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
