// src/pages/channels/ChannelsIntegrationPage.tsx
import {
  Box,
  Typography,
  Stack,
  Skeleton,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  WhatsApp,
  Telegram,
  Chat,
  Instagram,
  Facebook,
  QrCode2,
} from "@mui/icons-material";
import { useMemo, useState, useCallback, type JSX } from "react";
import axios from "@/shared/api/axios";

import ChannelCard from "@/features/mechant/channels/ui/ChannelCard";
import WhatsappQrConnect from "@/features/mechant/channels/ui/WhatsappQrConnect";
import WhatsappApiConnectDialog from "@/features/mechant/channels/ui/WhatsappApiConnectDialog";
import TelegramConnectDialog from "@/features/mechant/channels/ui/TelegramConnectDialog";
import WebchatConnectDialog from "@/features/mechant/channels/ui/WebchatConnectDialog";
import ChannelDetailsDialog from "@/features/mechant/channels/ui/ChannelDetailsDialog";

import { useAuth } from "@/context/AuthContext";
import {
  CHANNELS,
  type ChannelKey,
} from "@/features/mechant/channels/constants";
import {
  useChannels,
  useUpdateChannelById,
  useDeleteChannelById,
} from "@/features/mechant/channels/model";

type ChannelDoc = {
  _id: string;
  merchantId: string;
  provider:
    | "telegram"
    | "whatsapp_cloud"
    | "whatsapp_qr"
    | "webchat"
    | "instagram"
    | "messenger";
  enabled?: boolean;
  status?: "connected" | "pending" | "disconnected" | string;
  webhookUrl?: string;
  sessionId?: string;
  instanceId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  accountLabel?: string;
  widgetSettings?: Record<string, unknown>;
  scopes?: string[];
  isDefault?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  botTokenEnc?: string;
  accessTokenEnc?: string;
  qr?: string;
};

const PROVIDER_BY_KEY: Record<ChannelKey, ChannelDoc["provider"]> = {
  telegram: "telegram",
  whatsappQr: "whatsapp_qr",
  whatsappApi: "whatsapp_cloud",
  webchat: "webchat",
  instagram: "instagram",
  messenger: "messenger",
};

const KEY_BY_PROVIDER: Record<ChannelDoc["provider"], ChannelKey> = {
  telegram: "telegram",
  whatsapp_qr: "whatsappQr",
  whatsapp_cloud: "whatsappApi",
  webchat: "webchat",
  instagram: "instagram",
  messenger: "messenger",
};

export default function ChannelsIntegrationPage() {
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";

  const {
    data: channelsList = [],
    isLoading,
    refetch,
  } = useChannels(merchantId);

  const { mutateAsync: updateChannel } = useUpdateChannelById();
  const { mutateAsync: removeChannel } = useDeleteChannelById();

  const [selectedChannel, setSelectedChannel] = useState<ChannelKey | null>(
    null
  );

  // Dialogs open flags
  const [openWhatsappQr, setOpenWhatsappQr] = useState(false);
  const [openWhatsappApi, setOpenWhatsappApi] = useState(false);
  const [openTelegram, setOpenTelegram] = useState(false);
  const [openWebchat, setOpenWebchat] = useState(false);

  // UI state
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [busyKey, setBusyKey] = useState<ChannelKey | null>(null); // لمنع تعدد النقرات

  const ICONS: Record<ChannelKey, JSX.Element> = useMemo(
    () => ({
      telegram: <Telegram fontSize="large" />,
      whatsappQr: <QrCode2 fontSize="large" />,
      webchat: <Chat fontSize="large" />,
      whatsappApi: <WhatsApp fontSize="large" />,
      instagram: <Instagram fontSize="large" />,
      messenger: <Facebook fontSize="large" />,
    }),
    []
  );

  const byKey = useMemo(() => {
    const map: Record<ChannelKey, ChannelDoc | undefined> = {
      telegram: undefined,
      whatsappQr: undefined,
      whatsappApi: undefined,
      webchat: undefined,
      instagram: undefined,
      messenger: undefined,
    };

    if (Array.isArray(channelsList)) {
      channelsList.forEach((c: ChannelDoc) => {
        const key = KEY_BY_PROVIDER[c.provider];
        if (key) map[key] = c;
        else if (process.env.NODE_ENV === "development") {
          // provider غير معروف – تجاهله بأمان
          // eslint-disable-next-line no-console
          console.warn("Unknown channel provider:", c.provider, c);
        }
      });
    }
    return map;
  }, [channelsList]);

  const detailData = selectedChannel
    ? (byKey[selectedChannel] as any)
    : undefined;
  const selectedDoc = selectedChannel ? byKey[selectedChannel] : undefined;

  const openConnector = (key: ChannelKey) => {
    if (key === "whatsappQr") return setOpenWhatsappQr(true);
    if (key === "whatsappApi") return setOpenWhatsappApi(true);
    if (key === "telegram") return setOpenTelegram(true);
    if (key === "webchat") return setOpenWebchat(true);
  };

  const ensureChannelId = useCallback(
    async (key: ChannelKey) => {
      const existing = byKey[key]?._id;
      if (existing) return existing;

      try {
        const provider = PROVIDER_BY_KEY[key];
        const { data } = await axios.post(`/merchants/${merchantId}/channels`, {
          provider,
          isDefault: true,
        });
        await refetch();
        return data?._id as string;
      } catch (e: any) {
        setToast({
          msg: e?.response?.data?.message || "تعذر إنشاء القناة. حاول مجددًا.",
          type: "error",
        });
        throw e;
      }
    },
    [byKey, merchantId, refetch]
  );

  const handleToggle = async (key: ChannelKey, wantEnabled: boolean) => {
    if (busyKey) return; // تجاهل أحداث متزامنة
    setBusyKey(key);

    try {
      // تعطيل سريع
      if (!wantEnabled) {
        const id = byKey[key]?._id;
        if (id) {
          await removeChannel({ id, mode: "disable" });
          await refetch();
        }
        setToast({ msg: "تم تعطيل القناة", type: "success" });
        return;
      }

      // تمكين
      const id = await ensureChannelId(key);

      // قنوات تحتاج معالج ربط
      if (["whatsappQr", "whatsappApi", "telegram", "webchat"].includes(key)) {
        openConnector(key);
        return;
      }

      // قنوات بدون Wizard (مستقبلاً)
      await updateChannel({ id, partial: { enabled: true } });
      await refetch();
      setToast({ msg: "تم التفعيل", type: "success" });
    } catch {
      // تمت معالجة الرسالة في ensureChannelId / catch العام
    } finally {
      setBusyKey(null);
    }
  };

  const handleDialogSuccess = async () => {
    try {
      await refetch();
      setToast({ msg: "تم الربط بنجاح", type: "success" });
    } catch {
      setToast({ msg: "فشل تحديث الحالة بعد الربط", type: "error" });
    }
  };

  const comingSoon = (key: ChannelKey) =>
    key === "instagram" || key === "messenger";
  const dangerNote = (key: ChannelKey) =>
    key === "whatsappApi"
      ? "تنبيه: خيار المسح الكامل سيحذف جميع أسرار واتساب Cloud من قاعدة البيانات."
      : key === "whatsappQr"
      ? "تنبيه: خيار الفصل سيحذف الجلسة من مزوّد الـ QR، وقد تحتاج لإعادة المسح."
      : undefined;

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 4 },
        maxWidth: { xs: "100%", xl: 1400 },
        mx: "auto",
        bgcolor: (t) =>
          t.palette.mode === "light" ? "#f9fafb" : "background.default",
      }}
    >
      <Typography
        variant="h4"
        fontWeight={800}
        mb={3}
        textAlign="right"
        sx={{ letterSpacing: ".2px" }}
        aria-label="إعدادات القنوات وتكاملها"
      >
        إعدادات القنوات وتكاملها
      </Typography>

      <Stack
        direction="row"
        flexWrap="wrap"
        gap={{ xs: 1.5, sm: 2, md: 3 }}
        justifyContent={{ xs: "center", md: "flex-start" }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Box
                key={i}
                sx={{ flex: "1 1 260px", minWidth: 260, maxWidth: 340 }}
              >
                <Skeleton variant="rounded" height={168} />
              </Box>
            ))
          : CHANNELS.map((ch) => {
              const doc = byKey[ch.key];
              const enabled = !!doc?.enabled;
              const status = doc?.status;

              // لون الحالة
              const statusColor =
                ch.key === "messenger" && doc
                  ? "#5856D6"
                  : status === "connected"
                  ? "success.main"
                  : status === "pending"
                  ? "warning.main"
                  : status === "disconnected"
                  ? "error.main"
                  : undefined;

              return (
                <Box
                  key={ch.key}
                  sx={{
                    flex: "1 1 260px",
                    minWidth: 260,
                    maxWidth: 340,
                    minHeight: 0,
                  }}
                >
                  <ChannelCard
                    icon={ICONS[ch.key]}
                    title={`${ch.title}${status ? ` (${status})` : ""}`}
                    enabled={enabled}
                    isLoading={busyKey === ch.key} // ✅ سبنر على البطاقة أثناء الاتصال
                    onToggle={(checked) => handleToggle(ch.key, checked)}
                    onGuide={() => setSelectedChannel(ch.key)}
                    statusColor={statusColor}
                    onCardClick={() => setSelectedChannel(ch.key)}
                    disabled={comingSoon(ch.key)}
                  />
                </Box>
              );
            })}
      </Stack>

      {/* واتساب QR */}
      <WhatsappQrConnect
        open={openWhatsappQr}
        onClose={() => setOpenWhatsappQr(false)}
        merchantId={merchantId}
        channelId={byKey.whatsappQr?._id}
        onSuccess={() => {
          setOpenWhatsappQr(false);
          handleDialogSuccess();
        }}
      />

      {/* واتساب Cloud API */}
      <WhatsappApiConnectDialog
        open={openWhatsappApi}
        onClose={(success) => {
          setOpenWhatsappApi(false);
          if (success) handleDialogSuccess();
        }}
        merchantId={merchantId}
        channelId={byKey.whatsappApi?._id}
      />

      {/* تيليجرام */}
      <TelegramConnectDialog
        open={openTelegram}
        onClose={(success) => {
          setOpenTelegram(false);
          if (success) handleDialogSuccess();
        }}
        merchantId={merchantId}
        channelId={byKey.telegram?._id}
      />

      {/* ويب شات */}
      <WebchatConnectDialog
        open={openWebchat}
        onClose={(success) => {
          setOpenWebchat(false);
          if (success) handleDialogSuccess();
        }}
        merchantId={merchantId}
        channelId={byKey.webchat?._id}
      />

      {/* تفاصيل القناة + الإجراءات */}
      <ChannelDetailsDialog
        open={!!selectedChannel}
        onClose={() => setSelectedChannel(null)}
        title={CHANNELS.find((c) => c.key === selectedChannel)?.title ?? ""}
        data={detailData as any}
        dangerNote={selectedChannel ? dangerNote(selectedChannel) : undefined}
        onDisable={
          selectedDoc
            ? async () => {
                try {
                  await removeChannel({ id: selectedDoc._id, mode: "disable" });
                  setSelectedChannel(null);
                  await refetch();
                  setToast({ msg: "تم تعطيل القناة", type: "success" });
                } catch {
                  setToast({ msg: "تعذر تعطيل القناة", type: "error" });
                }
              }
            : undefined
        }
        onDisconnect={
          selectedDoc
            ? async () => {
                try {
                  if (!window.confirm("تأكيد فصل القناة؟")) return;
                  await removeChannel({
                    id: selectedDoc._id,
                    mode: "disconnect",
                  });
                  setSelectedChannel(null);
                  await refetch();
                  setToast({ msg: "تم فصل القناة", type: "success" });
                } catch {
                  setToast({ msg: "تعذر فصل القناة", type: "error" });
                }
              }
            : undefined
        }
        onWipe={
          selectedDoc
            ? async () => {
                try {
                  if (
                    !window.confirm(
                      "تحذير! سيتم حذف الإعدادات الحساسة نهائيًا. متابعة؟"
                    )
                  )
                    return;
                  await removeChannel({ id: selectedDoc._id, mode: "wipe" });
                  setSelectedChannel(null);
                  await refetch();
                  setToast({ msg: "تم المسح الكامل", type: "success" });
                } catch {
                  setToast({ msg: "تعذر المسح الكامل", type: "error" });
                }
              }
            : undefined
        }
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {toast ? <Alert severity={toast.type}>{toast.msg}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
}
