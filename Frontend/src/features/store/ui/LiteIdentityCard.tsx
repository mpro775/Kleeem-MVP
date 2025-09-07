import { useState } from "react";
import { Box, TextField, Button, Stack, Alert } from "@mui/material";
import axiosInstance from "@/shared/api/axios";
import { getSessionId } from "@/shared/utils/session";
import { getLocalCustomer, saveLocalCustomer } from "@/shared/utils/customer";

export default function LiteIdentityCard({ merchantId }: { merchantId: string }) {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, background: "white", borderRadius: 3, boxShadow: "0 5px 15px rgba(0,0,0,0.05)", mb: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="الاسم" value={name} onChange={(e)=>setName(e.target.value)} fullWidth />
        <TextField label="الجوال" value={phone} onChange={(e)=>setPhone(e.target.value)} fullWidth required />
        <TextField label="العنوان" value={address} onChange={(e)=>setAddress(e.target.value)} fullWidth />
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={loading || !phone}
          sx={{ backgroundColor: "var(--brand)", color: "var(--on-brand)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
        >
          حفظ
        </Button>
      </Stack>
      {ok && <Alert sx={{ mt: 2 }} severity="success">تم حفظ بياناتك—سنظهر طلباتك تلقائيًا.</Alert>}
    </Box>
  );
}
