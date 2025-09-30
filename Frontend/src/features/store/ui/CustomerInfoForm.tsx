import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Stack } from "@mui/material";
import axios from "@/shared/api/axios";
import type { CustomerInfo } from "../type";
import { getLocalCustomer, saveLocalCustomer, type LiteCustomer } from "@/shared/utils/customer";
import { getSessionId } from "@/shared/utils/session";

export default function CustomerInfoForm({
  merchantId,
  onComplete,
}: {
  merchantId: string;
  onComplete: (info: CustomerInfo) => void;
}) {
  const [form, setForm] = useState<CustomerInfo>({
    name: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  // املأ من التخزين المحلي لتبسيط أول إطلاق
  useEffect(() => {
    const existing = getLocalCustomer();
    if (existing?.phone) setForm(existing as CustomerInfo);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sessionId = getSessionId();

    await axios.post(`/storefront/merchant/${merchantId}/leads`, {
      sessionId,
      data: form,
      source: "storefront",
    });

    saveLocalCustomer(form as LiteCustomer);
    setLoading(false);
    onComplete(form);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          name="name"
          label="الاسم"
          value={form.name}
          onChange={handleChange}
          required
        />
        <TextField
          name="phone"
          label="رقم الجوال"
          value={form.phone}
          onChange={handleChange}
          required
        />
        <TextField
          name="address"
          label="العنوان"
          value={form.address}
          onChange={handleChange}
          required
        />
        <Button
          variant="contained"
          type="submit"
          disabled={loading}
          sx={{
            backgroundColor: "var(--brand)",
            color: "var(--on-brand)",
            "&:hover": { backgroundColor: "var(--brand-hover)" },
          }}
        >
          {loading ? "جارٍ الحفظ..." : "متابعة"}
        </Button>
      </Stack>
    </Box>
  );
}
