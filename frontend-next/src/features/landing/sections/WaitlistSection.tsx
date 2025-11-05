'use client';

// src/components/landing/WaitlistSection.tsx
import { useMemo, useState } from "react";
import {
  Box, Container, Typography, TextField, Button, Alert,
  Stack, Chip, MenuItem, FormControlLabel, Checkbox, alpha
} from "@mui/material";
import { styled } from "@mui/material/styles";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import axios from "axios";

// Helper function to get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

const Section = styled(Box)(({ theme }) => ({
  position: "relative",
  paddingTop: theme.spacing(10),
  paddingBottom: theme.spacing(12),
  background:
    theme.palette.mode === "dark"
      ? "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)"
      : "linear-gradient(180deg, #fff, #f8fafc)",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: -2,
    background:
      "conic-gradient(from 180deg at 50% 50%, rgba(86,63,166,0.06), rgba(255,133,0,0.06), rgba(86,63,166,0.06))",
    filter: "blur(60px)",
    opacity: 0.5,
    pointerEvents: "none",
  },
}));

type FormState = {
  name: string;
  email: string;
  phone: string;
  hasStore: "yes" | "no";
  platform: "Salla" | "Zid" | "Shopify" | "WooCommerce" | "None";
  interest: "assistant" | "mini-store" | "both";
  notes: string;
  agree: boolean;
  // honeypot
  company?: string;
};

function getUTM() {
  const url = new URL(window.location.href);
  const qp = url.searchParams;
  const keys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
  const out: Record<string, string> = {};
  keys.forEach(k => { const v = qp.get(k); if (v) out[k] = v; });
  return {
    ...out,
    pageUrl: url.toString(),
    referrer: document.referrer || undefined,
  };
}

export default function WaitlistSection() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    hasStore: "no",
    platform: "None",
    interest: "both",
    notes: "",
    agree: true,
    company: "", // honeypot
  });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const disabled = useMemo(() => {
    const emailOk = /\S+@\S+\.\S+/.test(form.email);
    return loading || !emailOk || !form.agree;
  }, [form, loading]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = "checked" in e.target ? e.target.checked : false;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);

    // honeypot: إن امتلأت الحقل المخفي نرفض الإرسال
    if (form.company && form.company.trim().length > 0) {
      setErr("تم رفض الإرسال.");
      return;
    }

    try {
      setLoading(true);
      const sessionId = getSessionId();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      await axios.post(
        `${apiUrl}/waitlist-leads`,
        {
          sessionId,
          email: form.email,
          name: form.name || undefined,
          phone: form.phone || undefined,
          hasStore: form.hasStore,
          platform: form.platform,
          interest: form.interest,
          notes: form.notes || undefined,
          ...getUTM(),
        }
      );

      setOk(true);
      // حفظ سريع محلّيًا لتجربة أفضل
      localStorage.setItem("kleem:waitlistJoined", "1");
      setForm((f) => ({ ...f, notes: "" }));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "تعذّر الإرسال، حاول لاحقًا.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section id="waitlist" dir="rtl">
      <Container maxWidth="sm" sx={{ px: 2 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Chip label="وصول مبكّر" />
          <Typography variant="h3" sx={{ fontWeight: 900, mt: 1.5, mb: 1 }}>
            انضم لقائمة الانتظار
          </Typography>
          <Typography color="text.secondary">
            سجّل بريدك وبعض التفاصيل لنرسل لك الدعوة للإصدار الأوّل والمزايا الحصرية للأوائل.
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: "background.paper",
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
            boxShadow: (t) => (t.palette.mode === "dark" ? "none" : "0 12px 30px rgba(2,6,23,0.06)"),
          }}
        >
          <Stack spacing={2.2}>
            {/* honeypot */}
            <TextField
              name="company"
              label="Company"
              value={form.company}
              onChange={onChange}
              sx={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            <TextField
              name="email"
              label="البريد الإلكتروني *"
              value={form.email}
              onChange={onChange}
              required
              type="email"
              inputMode="email"
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                name="name"
                label="الاسم (اختياري)"
                value={form.name}
                onChange={onChange}
              />
              <TextField
                name="phone"
                label="الجوال (اختياري)"
                value={form.phone}
                onChange={onChange}
                inputMode="tel"
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                name="hasStore"
                label="هل لديك متجر؟"
                value={form.hasStore}
                onChange={onChange}
              >
                <MenuItem value="yes">نعم</MenuItem>
                <MenuItem value="no">لا</MenuItem>
              </TextField>

              <TextField
                select
                name="platform"
                label="المنصة"
                value={form.platform}
                onChange={onChange}
                helperText="اختر منصتك إن وجدت"
              >
                <MenuItem value="Salla">سلة</MenuItem>
                <MenuItem value="Zid">زد</MenuItem>
                <MenuItem value="Shopify">Shopify</MenuItem>
                <MenuItem value="WooCommerce">WooCommerce</MenuItem>
                <MenuItem value="None">لا يوجد</MenuItem>
              </TextField>
            </Stack>

            <TextField
              select
              name="interest"
              label="ما يهمّك أكثر"
              value={form.interest}
              onChange={onChange}
            >
              <MenuItem value="assistant">مساعد المحادثة</MenuItem>
              <MenuItem value="mini-store">المتجر المصغّر</MenuItem>
              <MenuItem value="both">كلاهما</MenuItem>
            </TextField>

            <TextField
              name="notes"
              label="ملاحظات (اختياري)"
              value={form.notes}
              onChange={onChange}
              multiline
              minRows={3}
            />

            <FormControlLabel
              control={
                <Checkbox
                  name="agree"
                  checked={form.agree}
                  onChange={onChange}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  أوافق على استلام مراسلات متعلقة بالإطلاق وسياسة الخصوصية.
                </Typography>
              }
            />

            {err && <Alert severity="error">{err}</Alert>}
            {ok && (
              <Alert severity="success">
                شكراً لانضمامك! سنراسلُك فور جاهزية الوصول المبكر.
              </Alert>
            )}

            <Button
              type="submit"
              size="large"
              variant="contained"
              disabled={disabled}
              startIcon={<RocketLaunchRoundedIcon />}
              sx={{ fontWeight: 800 }}
            >
              انضم الآن
            </Button>
          </Stack>
        </Box>
      </Container>
    </Section>
  );
}
