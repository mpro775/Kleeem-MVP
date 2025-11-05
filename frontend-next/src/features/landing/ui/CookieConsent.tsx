'use client';

// src/components/landing/CookieConsent.tsx
import { useState } from "react";
import { Snackbar, Alert, Button, Stack } from "@mui/material";

export default function CookieConsent() {
  const [open, setOpen] = useState(!localStorage.getItem("cookie-ok"));
  const accept = () => {
    localStorage.setItem("cookie-ok", "1");
    setOpen(false);
    // TODO: تفعيل GTM/GA4 هنا بعد الموافقة
  };
  return (
    <Snackbar open={open} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert severity="info" sx={{ bgcolor: "background.paper" }}>
        نستخدم ملفات تعريف الارتباط لتحسين التجربة.
        <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
          <Button size="small" onClick={accept} variant="contained">موافقة</Button>
        </Stack>
      </Alert>
    </Snackbar>
  );
}
