// src/features/mechant/channels/ui/WhatsappQrConnect.tsx
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import axios from "@/shared/api/axios";

type Props = {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  channelId?: string;
  onSuccess: () => void;
};

export default function WhatsappQrConnect({
  open,
  onClose,
  channelId,
  onSuccess,
}: Props) {
  const [qr, setQr] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string>("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const firedSuccessRef = useRef(false);

  const startPolling = () => {
    if (!pollingRef.current)
      pollingRef.current = setInterval(fetchStatus, 4000);
  };
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const normalizeQr = (data: any): string | null => {
    // يدعم جميع الأشكال: {qr} أو {qrcode:{base64}} أو {qrcode:"data:image/..."}
    if (data?.qr)
      return data.qr.startsWith("data:image/")
        ? data.qr
        : `data:image/png;base64,${data.qr}`;
    if (data?.qrcode?.base64) return data.qrcode.base64;
    if (
      typeof data?.qrcode === "string" &&
      data.qrcode.startsWith("data:image/")
    )
      return data.qrcode;
    return null;
  };

  const handleStart = async () => {
    if (!channelId) return;
    setLoading(true);
    setQr("");
    setStatus("");
    setHint("");
    firedSuccessRef.current = false;
    try {
      const { data } = await axios.post(
        `/channels/${channelId}/actions/connect`,
        {}
      );
      const q = normalizeQr(data);
      if (q) {
        setQr(q);
        startPolling();
      } else {
        setHint(
          "لم نستلم صورة QR من الخادم. أعد المحاولة أو تحقق من سجل الخادم."
        );
      }
    } catch (e: any) {
      setHint("تعذر بدء الجلسة. تحقق من الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!channelId) return;
    try {
      const { data } = await axios.get(`/channels/${channelId}/status`);
      const raw = String(
        data?.status || data?.details?.status || ""
      ).toUpperCase();
      setStatus(raw);

      const ok = ["CONNECTED", "OPEN", "AUTHENTICATED"].includes(raw);
      if (ok && !firedSuccessRef.current) {
        firedSuccessRef.current = true;
        stopPolling();
        onSuccess();
      }
    } catch {
      // تجاهل نبضة فاشلة
    }
  };

  useEffect(() => {
    if (!open) {
      stopPolling();
      setQr("");
      setStatus("");
      setHint("");
      firedSuccessRef.current = false;
    }
  }, [open]);

  const connected = ["CONNECTED", "OPEN", "AUTHENTICATED"].includes(
    String(status).toUpperCase()
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle dir="rtl">ربط واتساب - QR</DialogTitle>
      <DialogContent dir="rtl">
        <Box display="flex" flexDirection="column" gap={2} alignItems="center">
          <Button
            variant="contained"
            color="success"
            onClick={handleStart}
            disabled={loading || connected || !channelId}
          >
            {loading ? (
              <CircularProgress size={22} />
            ) : connected ? (
              "مرتبط ✅"
            ) : (
              "بدء الربط"
            )}
          </Button>

          {hint && (
            <Alert severity="warning" sx={{ width: "100%" }}>
              {hint}
            </Alert>
          )}

          {qr && !connected && (
            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="text.secondary" mb={1}>
                امسح الكود عبر تطبيق واتساب
              </Typography>
              <img
                src={qr}
                alt="QR"
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 12,
                  border: "1px solid #eee",
                }}
              />
            </Box>
          )}

          {status && (
            <Box mt={2} textAlign="center" sx={{ width: "100%" }}>
              {connected ? (
                <Typography sx={{ color: "success.main", fontWeight: "bold" }}>
                  ✅ تم الربط بنجاح!
                </Typography>
              ) : (
                <Typography sx={{ color: "warning.main" }}>
                  الحالة: {status}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
