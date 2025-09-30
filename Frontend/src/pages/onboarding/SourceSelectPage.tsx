// src/pages/onboarding/SourceSelectPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useAuth } from "@/context/hooks";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "@/shared/api/axios";
import { API_BASE } from "@/context/config";
import OnboardingLayout from "@/app/layout/OnboardingLayout";
import type { IntegrationsStatus } from "@/features/integtarions/api/integrationsApi";

type Source = "internal" | "salla" | "zid";
const isExternal = (s: IntegrationsStatus) =>
  s.productSource === "salla" || s.productSource === "zid";

export default function SourceSelectPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [source, setSource] = useState<Source>("internal");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<null | "salla" | "zid">(null);
  const [status, setStatus] = useState<IntegrationsStatus>({
    productSource: "internal",
    skipped: true,
  });
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );
  const location = useLocation();

  const stopPolling = () => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };
  useEffect(() => () => stopPolling(), []);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("install") === "zid") {
      setSource("zid");
      handleContinue(); // يبدأ الربط فورًا
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setProductSource = async (src: Source) => {
    if (!user?.merchantId) return;
    await axiosInstance.patch(
      `${API_BASE}/merchants/${user.merchantId}/product-source`,
      { source: src },
      { headers }
    );
  };

  const fetchStatus = async (src: Source): Promise<IntegrationsStatus> => {
    if (src === "internal") return { productSource: "internal", skipped: true };
    try {
      const { data } = await axiosInstance.get<IntegrationsStatus>(
        `${API_BASE}/integrations/status`,
        { headers }
      );
      setStatus(data);
      return data;
    } catch {
      return { productSource: "internal", skipped: true };
    }
  };

  const handleContinue = async () => {
    setError(null);
    try {
      setSaving(true);

      // ✅ غيّر المصدر فقط عندما يكون internal
      if (source === "internal") {
        await setProductSource(source);
        navigate("/dashboard");
        return;
      }

      // ✅ لمزودي الخارج (زد/سلة): لا نغير المصدر هنا
      setConnecting(source);
      const url = `${API_BASE}/integrations/${source}/connect`;
      const popup = window.open(url, "_blank", "noopener,noreferrer");

      await fetchStatus(source);
      // (اختياري) لو أضفنا postMessage من الكولباك، نسمعه هنا لإغلاق البولنغ أسرع
      const onMsg = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.provider === source && e.data?.connected) {
          stopPolling();
          setConnecting(null);
          popup?.close?.();
          navigate("/onboarding/sync");
        }
      };
      window.addEventListener("message", onMsg);

      pollTimer.current = window.setInterval(async () => {
        const st = await fetchStatus(source);
        const ok =
          isExternal(st) &&
          (source === "salla" ? !!st.salla?.connected : !!st.zid?.connected);
        if (ok) {
          stopPolling();
          window.removeEventListener("message", onMsg);
          setConnecting(null);
          navigate("/onboarding/sync");
        }
      }, 2000);
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={2}
      total={3}
      title={
        <Typography variant="h4" fontWeight="bold" sx={{ color: "#502E91" }}>
          اختر مصدر بيانات المنتجات
        </Typography>
      }
      subtitle={
        <Typography variant="body1" sx={{ color: "#8589A0" }}>
          اربط مزود خارجي أو استخدم كليم كمصدر داخلي
        </Typography>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <RadioGroup
        value={source}
        onChange={(e) => setSource(e.target.value as Source)}
        sx={{ textAlign: "left", mx: "auto", width: "fit-content" }}
      >
        <FormControlLabel
          value="internal"
          control={<Radio />}
          label="كليم (داخلي)"
        />
        <FormControlLabel value="salla" control={<Radio />} label="سلة" />
        <FormControlLabel value="zid" control={<Radio />} label="زد" />
      </RadioGroup>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleContinue}
          disabled={saving || !!connecting}
          sx={{
            fontWeight: "bold",
            py: 1.7,
            fontSize: 18,
            borderRadius: 2,
            background: "linear-gradient(90deg, #A498CB, #502E91)",
          }}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : "متابعة"}
        </Button>
      </Box>

      {connecting && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography sx={{ color: "#8589A0", mb: 1 }}>
            جارٍ إتمام الربط مع {connecting === "salla" ? "سلة" : "زد"}...
          </Typography>
          <CircularProgress />
          <Typography variant="body2" sx={{ color: "#A498CB", mt: 1 }}>
            أبقِ هذه الصفحة مفتوحة. سيتم نقلك تلقائيًا بعد اكتمال الربط
          </Typography>
        </Box>
      )}

      {isExternal(status) && (status.salla || status.zid) && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#8589A0" }}>
            الحالة: سلة {status.salla?.connected ? "متصلة" : "غير متصلة"} — زد{" "}
            {status.zid?.connected ? "متصلة" : "غير متصلة"}
          </Typography>
        </Box>
      )}
    </OnboardingLayout>
  );
}
