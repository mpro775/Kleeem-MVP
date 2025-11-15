import  { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  Box,
} from "@mui/material";
import axiosInstance from "@/shared/api/axios";
import { getSessionId } from "@/shared/utils/session";
import { getLocalCustomer, saveLocalCustomer } from "@/shared/utils/customer";

type Props = {
  open: boolean;
  onClose: () => void;
  merchantId: string;
};

export default function CustomerInfoDialog({
  open,
  onClose,
  merchantId,
}: Props) {
  const existing = getLocalCustomer();
  const [name, setName] = useState(existing.name || "");
  const [phone, setPhone] = useState(existing.phone || "");
  const [address, setAddress] = useState(existing.address || "");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const sessionId = getSessionId();
      await axiosInstance.post(`/storefront/merchant/${merchantId}/leads`, {
        sessionId,
        data: { name, phone, address },
        source: "mini-store",
      });
      saveLocalCustomer({ name, phone, address });
      setOk(true);
      setTimeout(() => setOk(false), 2500);
      // أغلق الدايلوج بعد نجاح الحفظ بثانية صغيرة (اختياري)
      setTimeout(onClose, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: "bold" }}>معلوماتي</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "var(--brand)",
                },
                "&:hover fieldset": {
                  borderColor: "var(--brand-hover)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--brand)",
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "var(--brand)",
              },
            }}
          />
          <TextField
            label="الجوال"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            required
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "var(--brand)",
                },
                "&:hover fieldset": {
                  borderColor: "var(--brand-hover)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--brand)",
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "var(--brand)",
              },
            }}
          />
          <TextField
            label="العنوان"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "var(--brand)",
                },
                "&:hover fieldset": {
                  borderColor: "var(--brand-hover)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--brand)",
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "var(--brand)",
              },
            }}
          />
          {ok && (
            <Alert severity="success">
              تم حفظ بياناتك—سنظهر طلباتك تلقائيًا.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button sx={{ color: "var(--on-brand)" , background: "var(--brand)" , "&:hover": { backgroundColor: "var(--brand-hover)" } }} onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={loading || !phone}
          sx={{
            background: "var(--brand)",
            color: "var(--on-brand)",
            "&:hover": { backgroundColor: "var(--brand-hover)" },
          }}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
