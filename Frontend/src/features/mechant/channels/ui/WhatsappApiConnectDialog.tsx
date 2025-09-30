import { useMemo, useState } from "react";
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
  InputAdornment,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import axiosInstance from "@/shared/api/axios";

type Props = {
  open: boolean;
  onClose: (success: boolean) => void;
  merchantId: string;
  channelId?: string;
};

export default function WhatsappApiConnectDialog({
  open,
  onClose,
  merchantId,
  channelId,
}: Props) {
  const [form, setForm] = useState({
    accessToken: "",
    appSecret: "",
    verifyToken: "",
    phoneNumberId: "",
    wabaId: "",
  });
  const [show, setShow] = useState({ accessToken: false, appSecret: false });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (k: string, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));
  const toggleShow = (k: "accessToken" | "appSecret") =>
    setShow((s) => ({ ...s, [k]: !s[k] }));

  const webhookUrl = useMemo(() => {
    const origin = window.location.origin.replace(/\/+$/, "");
    // لو كان عندك public webhook base مختلف استخدمه من الـ backend بدلاً من توليفه هنا
    return `${origin}/api/webhooks/${merchantId}/incoming`;
  }, [merchantId]);

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // Do nothing
    }
  };

  const ensureChannel = async (): Promise<string> => {
    if (channelId) return channelId;
    const { data } = await axiosInstance.post(`/merchants/${merchantId}/channels`, {
      provider: "whatsapp_cloud",
      isDefault: true,
      accountLabel: "WhatsApp Cloud",
    });
    return data._id as string;
  };

  const handleSave = async () => {
    if (
      !form.accessToken ||
      !form.appSecret ||
      !form.verifyToken ||
      !form.phoneNumberId
    ) {
      setError(
        "الحقول الأساسية مطلوبة: Access Token و App Secret و Verify Token و Phone Number ID"
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ensureChannel();
      await axiosInstance.patch(`/channels/${channelId}`, {
        accessToken: form.accessToken,
        appSecret: form.appSecret,
        verifyToken: form.verifyToken,
        phoneNumberId: form.phoneNumberId,
        wabaId: form.wabaId || undefined,
        enabled: true,
      });
      setOk(true);
      onClose(true);
    } catch {
      setError("تعذر حفظ الإعدادات. تأكد من القيم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle dir="rtl">ربط واتساب الرسمي (Cloud API)</DialogTitle>
      <DialogContent dir="rtl" sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          أدخل بيانات WABA من منصة Meta. انسخ Webhook التالي والصقه في إعدادات
          التطبيق.
        </Typography>

        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <TextField
            label="Webhook URL"
            fullWidth
            value={webhookUrl}
            InputProps={{ readOnly: true }}
          />
          <IconButton onClick={() => copy(webhookUrl)}>
            <ContentCopyIcon />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Access Token"
              fullWidth
              type={show.accessToken ? "text" : "password"}
              value={form.accessToken}
              onChange={(e) => handleChange("accessToken", e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleShow("accessToken")}>
                      {show.accessToken ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="App Secret"
              fullWidth
              type={show.appSecret ? "text" : "password"}
              value={form.appSecret}
              onChange={(e) => handleChange("appSecret", e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleShow("appSecret")}>
                      {show.appSecret ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Verify Token"
              fullWidth
              value={form.verifyToken}
              onChange={(e) => handleChange("verifyToken", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Phone Number ID"
              fullWidth
              value={form.phoneNumberId}
              onChange={(e) => handleChange("phoneNumberId", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="WABA ID (اختياري)"
              fullWidth
              value={form.wabaId}
              onChange={(e) => handleChange("wabaId", e.target.value)}
            />
          </Grid>
        </Grid>

        {error && (
          <Box mt={2}>
            <Typography sx={{ color: "error.main" }}>{error}</Typography>
          </Box>
        )}
        {ok && (
          <Box mt={2}>
            <Typography sx={{ color: "success.main" }}>
              ✅ تم الحفظ والتفعيل!
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={loading || ok}
        >
          {loading ? <CircularProgress size={22} /> : "حفظ وتفعيل"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
