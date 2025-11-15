import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress,
} from "@mui/material";
import axiosInstance from "@/shared/api/axios";

interface WebchatConnectDialogProps {
  open: boolean;
  onClose: (success: boolean) => void;
  merchantId: string;
  channelId?: string;              // جديد
  initialEnabled?: boolean;
}

export default function WebchatConnectDialog({
  open,
  onClose,
  merchantId,
  channelId,
  initialEnabled = false,
}: WebchatConnectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(initialEnabled || false);
  const [error, setError] = useState<string | null>(null);

  // لو ما فيه channelId، أنشيء قناة webchat افتراضية وأرجع الـ id
  const ensureChannel = async (): Promise<string> => {
    if (channelId) return channelId;
    const { data } = await axiosInstance.post(`/merchants/${merchantId}/channels`, {
      provider: "webchat",
      isDefault: true,
      accountLabel: "Webchat",
    });
    return data._id as string;
  };

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureChannel();
      await axiosInstance.patch(`/channels/${channelId}`, { enabled: true, widgetSettings: {} });
      setConnected(true);
      onClose(true);
    } catch {
      setError("فشل الربط");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="xs">
      <DialogTitle dir="rtl">تفعيل كليم (Web Chat)</DialogTitle>
      <DialogContent dir="rtl">
        <Typography>لتفعيل الويب شات اضغط تفعيل، وسيتم تفعيل القناة وتوليد كود الويدجت.</Typography>
        {error && (
          <Box mt={2}>
            <Typography sx={{ color: "error.main" }}>{error}</Typography>
          </Box>
        )}
        {connected && (
          <Box mt={2}>
            <Typography sx={{ color: "success.main" }}>✅ تم التفعيل بنجاح!</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>إغلاق</Button>
        <Button onClick={handleEnable} variant="contained" color="primary" disabled={loading || connected}>
          {loading ? <CircularProgress size={22} /> : "تفعيل"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
