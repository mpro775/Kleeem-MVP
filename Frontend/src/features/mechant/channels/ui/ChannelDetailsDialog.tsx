// src/features/mechant/channels/ui/ChannelDetailsDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Button,
  Box,
  Stack,
  Chip,
  Divider,
  Typography,
  Grid,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShieldIcon from "@mui/icons-material/Shield";
import LinkIcon from "@mui/icons-material/Link";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import ChatIcon from "@mui/icons-material/Chat";
import { useMemo } from "react";

type Provider = "telegram" | "whatsapp_qr" | "whatsapp_cloud" | "webchat" | "instagram" | "messenger";

type ChannelDoc = {
  _id: string;
  provider: Provider;
  enabled?: boolean;
  status?: string;
  // common
  webhookUrl?: string;
  accountLabel?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // telegram
  username?: string;
  defaultChatId?: string;
  botTokenEnc?: string;
  // whatsapp cloud
  phoneNumberId?: string;
  wabaId?: string;
  accessTokenEnc?: string;
  appSecretEnc?: string;
  verifyTokenHash?: string;
  // whatsapp qr
  sessionId?: string;
  instanceId?: string;
  qr?: string;
  // webchat
  widgetSettings?: Record<string, unknown>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  data?: ChannelDoc;
  dangerNote?: string;
  onDisable?: () => Promise<void> | void;
  onDisconnect?: () => Promise<void> | void;
  onWipe?: () => Promise<void> | void;
};

const mask = (v?: string) => {
  if (!v) return "";
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 4)}••••${v.slice(-4)}`;
};

const copy = async (v?: string) => {
  if (!v) return;
  try {
    await navigator.clipboard.writeText(v);
  } catch {}
};

const statusChip = (status?: string, enabled?: boolean) => {
  const s = (status || "").toLowerCase();
  const label = enabled === false ? "disabled" : status || "—";
  if (!enabled) return <Chip size="small" label={label} color="default" />;
  if (["connected", "open", "authenticated"].includes(s))
    return <Chip size="small" label={label} color="success" />;
  if (["pending", "qrcode", "waiting"].includes(s))
    return <Chip size="small" label={label} color="warning" />;
  if (["error", "revoked", "throttled"].includes(s))
    return <Chip size="small" label={label} color="error" />;
  return <Chip size="small" label={label} color="default" />;
};

const FieldRow = ({
  label,
  value,
  canCopy = true,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  canCopy?: boolean;
  mono?: boolean;
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <Grid container spacing={1} alignItems="center" sx={{ my: 0.5 }}>
      <Grid size={{xs:4}}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right" }}>
          {label}
        </Typography>
      </Grid>
      <Grid size={{xs:8}}>
        <Box
          sx={{
            bgcolor: "#f7f8fa",
            border: "1px solid #eef0f3",
            borderRadius: 1,
            px: 1,
            py: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              wordBreak: "break-all",
              fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
              flex: 1,
            }}
          >
            {String(value)}
          </Typography>
          {canCopy && (
            <Tooltip title="نسخ">
              <IconButton size="small" onClick={() => copy(String(value))}>
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

const Section = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <Box sx={{ mt: 2.5 }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      {icon}
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
    </Stack>
    <Box>{children}</Box>
    <Divider sx={{ mt: 2 }} />
  </Box>
);

export default function ChannelDetailsDialog({
  open,
  onClose,
  title,
  data,
  dangerNote,
  onDisable,
  onDisconnect,
  onWipe,
}: Props) {
  const providerIcon = useMemo(() => {
    switch (data?.provider) {
      case "telegram":
        return <TelegramIcon fontSize="small" />;
      case "whatsapp_qr":
        return <QrCode2Icon fontSize="small" />;
      case "whatsapp_cloud":
        return <WhatsAppIcon fontSize="small" />;
      case "webchat":
        return <ChatIcon fontSize="small" />;
      default:
        return <SmartToyIcon fontSize="small" />;
    }
  }, [data?.provider]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle dir="rtl">
        <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            {providerIcon}
            <Typography component="span" fontWeight={800}>
              {title}
            </Typography>
          </Stack>
          {statusChip(data?.status, data?.enabled)}
        </Stack>
      </DialogTitle>

      <DialogContent dir="rtl" sx={{ pt: 1 }}>
        {/* نظرة عامة */}
        <Section title="النظرة العامة" icon={<ShieldIcon fontSize="small" />}>
          <Grid container spacing={1}>
            <FieldRow label="معرّف القناة" value={data?._id} />
            <FieldRow label="المزوّد" value={data?.provider} />
            <FieldRow label="اللقب" value={data?.accountLabel || "—"} canCopy={false} />
            <FieldRow label="آخر تحديث" value={data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"} canCopy={false} />
          </Grid>
        </Section>

        {/* حسب المزوّد */}
        {data?.provider === "telegram" && (
          <>
            <Section title="إعدادات تيليجرام" icon={<TelegramIcon fontSize="small" />}>
              <FieldRow label="اسم المستخدم" value={data.username || "—"} />
              <FieldRow label="حالة التوكن" value={data.botTokenEnc ? "محفوظ 🔒" : "غير موجود"} canCopy={false} />
              <FieldRow label="Default chat" value={data.defaultChatId || "—"} />
            </Section>
            <Section title="Webhook" icon={<LinkIcon fontSize="small" />}>
              <FieldRow label="Webhook URL" value={data.webhookUrl} mono />
              {/* لا نعرض التوكن نفسه، فقط حالة */}
              <Typography variant="caption" color="text.secondary">
                يتم التحقق عبر <b>Secret Token</b> في الهيدر. لا نعرضه هنا حفاظاً على الأمان.
              </Typography>
            </Section>
          </>
        )}

        {data?.provider === "whatsapp_cloud" && (
          <>
            <Section title="واتساب الرسمي (Cloud API)" icon={<WhatsAppIcon fontSize="small" />}>
              <FieldRow label="Phone Number ID" value={data.phoneNumberId || "—"} mono />
              <FieldRow label="WABA ID" value={data.wabaId || "—"} mono />
              <FieldRow label="Access Token" value={mask(data.accessTokenEnc ? "••••secret" : "")} canCopy={false} />
              <FieldRow label="App Secret" value={data.appSecretEnc ? "محفوظ 🔒" : "غير موجود"} canCopy={false} />
              <FieldRow label="Verify Token" value={data.verifyTokenHash ? "محفوظ (hash) 🔒" : "غير موجود"} canCopy={false} />
            </Section>
            <Section title="Webhook" icon={<LinkIcon fontSize="small" />}>
              <FieldRow label="Endpoint (GET)" value="/api/webhooks/:merchantId/incoming" canCopy={false} />
              <Typography variant="caption" color="text.secondary">
                قم بضبط <b>Webhook</b> في Meta على هذا المسار (GET للتحقق وPOST للرسائل).
              </Typography>
            </Section>
          </>
        )}

        {data?.provider === "whatsapp_qr" && (
          <>
            <Section title="واتساب عبر QR" icon={<QrCode2Icon fontSize="small" />}>
              <FieldRow label="Session ID" value={data.sessionId || "—"} mono />
              <FieldRow label="Instance ID" value={data.instanceId || "—"} mono />
              <FieldRow label="Webhook URL" value={data.webhookUrl || "—"} mono />
              <Typography variant="caption" color="text.secondary">
                عند “فصل”، سيتم إلغاء الجلسة من Evolution وتحتاج لمسح QR من جديد.
              </Typography>
            </Section>
          </>
        )}

        {data?.provider === "webchat" && (
          <>
            <Section title="كليم (ويب شات)" icon={<ChatIcon fontSize="small" />}>
              <FieldRow label="وضع الويدجت" value={data.widgetSettings ? "مُهيّأ" : "غير مُعد"} canCopy={false} />
              <Typography variant="caption" color="text.secondary">
                يمكنك الحصول على كود التضمين من نافذة “تفعيل كليم”.
              </Typography>
            </Section>
          </>
        )}

        {/* تنبيه الخطر */}
        {dangerNote && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: "#fff5f5",
              border: "1px solid #ffd9d9",
              borderRadius: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: "error.main" }}>
              ⚠️ {dangerNote}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }} dir="rtl">
        <Button onClick={onClose}>إغلاق</Button>
        {onDisable && (
          <Button onClick={onDisable} variant="outlined" color="warning">
            تعطيل
          </Button>
        )}
        {onDisconnect && (
          <Button onClick={onDisconnect} variant="outlined" color="secondary">
            فصل
          </Button>
        )}
        {onWipe && (
          <Button onClick={onWipe} variant="contained" color="error">
            مسح كامل
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
