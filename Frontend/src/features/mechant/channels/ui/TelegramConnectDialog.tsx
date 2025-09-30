// src/features/mechant/channels/ui/TelegramConnectDialog.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  Chip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axiosInstance from "@/shared/api/axios";
import { AxiosError } from "axios";

type Props = {
  open: boolean;
  onClose: (success: boolean) => void;
  merchantId: string;
  channelId?: string; // NEW
};

export default function TelegramConnectDialog({
  open,
  onClose,
  channelId,
}: Props) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
    } catch {
      // Do nothing
    }
  };

  const fetchStatus = useCallback(async () => {
    if (!open || !channelId) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get<{
        status: string;
        details?: { webhookUrl?: string; webhook_url?: string }
      }>(`/channels/${channelId}/status`);
      setStatus(data?.status || "");
      const hook =
        data?.details?.webhookUrl || data?.details?.webhook_url || "";
      if (hook) setWebhookUrl(hook);
      setConnected(data?.status === "connected");
    } catch {
      // Do nothing
    } finally {
      setBusy(false);
    }
  }, [open, channelId]);

  useEffect(() => {
    if (open) fetchStatus();
  }, [open, fetchStatus]);

  const handleConnect = async () => {
    if (!channelId) {
      setError("Channel is not created yet");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = token ? { botToken: token } : undefined;
      await axiosInstance.post(`/channels/${channelId}/actions/connect`, payload);
      await fetchStatus();
      onClose(true);
    } catch (e: unknown) {
      setError(
        ((e as AxiosError)?.response?.data as { message?: string })?.message ||
        (e as Error)?.message ||
        "فشل الربط، تأكد من صحة التوكن"
      );
    } finally {
      setLoading(false);
    }
  };

  const showConnected = connected || status === "connected";

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle dir="rtl">ربط تيليجرام</DialogTitle>
      <DialogContent dir="rtl" sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            سيُضبط Webhook تلقائياً مع Secret Token. إن كان البوت مربوط سابقًا،
            يمكنك الضغط مباشرة على «حفظ وربط».
          </Typography>

          <TextField
            label="توكن بوت تيليجرام (اختياري إذا كان مربوطًا مسبقًا)"
            placeholder="123456:ABC-DEF1234..."
            fullWidth
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading || showConnected}
            type="password"
          />

          {(busy || loading) && (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={18} />{" "}
              <Typography variant="body2">جارٍ المعالجة...</Typography>
            </Box>
          )}

          {status && (
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle2">الحالة:</Typography>
              <Chip
                size="small"
                color={showConnected ? "success" : "default"}
                label={status}
              />
            </Stack>
          )}

          {webhookUrl && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Webhook URL:
              </Typography>
              <Box
                sx={{
                  p: 1,
                  bgcolor: "#f6f7f8",
                  border: "1px solid #e6e8eb",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {webhookUrl}
                </Typography>
                <Tooltip title="نسخ">
                  <IconButton size="small" onClick={() => copy(webhookUrl)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          {error && (
            <Typography sx={{ color: "error.main" }}>{error}</Typography>
          )}
          {showConnected && (
            <Typography sx={{ color: "success.main", fontWeight: "bold" }}>
              ✅ تم الربط بنجاح
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>
          إغلاق
        </Button>
        <Button
          onClick={handleConnect}
          disabled={loading || showConnected}
          variant="contained"
          color="success"
        >
          {loading ? <CircularProgress size={22} /> : "حفظ وربط"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
