// src/pages/SettingsAdvancedPage.tsx
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Snackbar,
  Alert,
  Button,
  Stack,
  Divider,
  FormControlLabel,
  Switch,
  Checkbox,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/features/mechant/settings-advanced/hooks/useSettings";
import { useState } from "react";
import { ensureN8nWorkflow } from "@/features/mechant/settings-advanced/api";

// Presentational Components
import { ProfileSettings } from "@/features/mechant/settings-advanced/ui/ProfileSettings";
import { SecuritySettings } from "@/features/mechant/settings-advanced/ui/SecuritySettings";

export default function SettingsAdvancedPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const merchantId = user?.merchantId ?? "";

  const {
    loading,
    saving,
    profile,
    setProfile,
    snack,
    setSnack,
    handleSaveProfile,
    handleChangePassword,
  } = useSettings(userId, merchantId);

  // =========================
  // n8n Workflow Self-Heal UI
  // =========================
  const [wfEnsuring, setWfEnsuring] = useState(false);
  const [wfForceRecreate, setWfForceRecreate] = useState(false);
  const [wfActivate, setWfActivate] = useState(true);
  const [wfResult, setWfResult] = useState<{
    workflowId: string;
    recreated: boolean;
    activated: boolean;
  } | null>(null);

  const handleEnsureN8n = async () => {
    setWfEnsuring(true);
    try {
      const data = await ensureN8nWorkflow({
        forceRecreate: wfForceRecreate,
        activate: wfActivate,
      });

      setWfResult(data);
      setSnack({
        open: true,
        type: "success",
        msg: `تم ${
          data.recreated ? "إعادة إنشاء" : "تأكيد"
        } ورِك-فلو n8n بنجاح (ID: ${data.workflowId})`,
      });
    } catch (e: any) {
      setSnack({
        open: true,
        type: "error",
        msg: `فشل إصلاح ورِك-فلو n8n: ${e?.message || "خطأ غير معروف"}`,
      });
    } finally {
      setWfEnsuring(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, m: "auto", maxWidth: 1200 }}>
        <Typography sx={{ mb: 1 }}>جارِ تحميل الإعدادات…</Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        p: { xs: 2, md: 4 },
        display: "grid",
        gap: 2,
      }}
    >
      {/* 1) الملف الشخصي */}
      <ProfileSettings
        profile={profile}
        onProfileChange={(field, value) =>
          setProfile((p) => ({ ...p, [field]: value }))
        }
        onSave={handleSaveProfile}
        isSaving={!!saving.profile}
      />

      {/* 2) الأمان */}
      <SecuritySettings
        onChangePassword={handleChangePassword}
        isSaving={!!saving.password}
      />

      {/* 3) n8n Workflow (زر إصلاح/تأكيد) */}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Typography variant="h6">ورش عمل n8n</Typography>
          <Typography variant="body2" color="text.secondary">
            في حال حدوث خلل اليوم—يمكنك تأكيد وجود ورِك-فلو n8n أو إعادة إنشائه
            وتفعيله لنفسك فورًا.
          </Typography>

          {wfEnsuring && <LinearProgress />}

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={wfActivate}
                  onChange={(e) => setWfActivate(e.target.checked)}
                />
              }
              label="تفعيل بعد الإصلاح"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={wfForceRecreate}
                  onChange={(e) => setWfForceRecreate(e.target.checked)}
                />
              }
              label="إعادة إنشاء بالقوة"
            />

            <Button
              variant="contained"
              onClick={handleEnsureN8n}
              disabled={wfEnsuring}
            >
              {wfEnsuring ? "جارِ الإصلاح…" : "إصلاح/تأكيد ورِك-فلو n8n الآن"}
            </Button>
          </Stack>

          {wfResult && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2">
                <strong>Workflow ID:</strong> {wfResult.workflowId}
              </Typography>
              <Typography variant="body2">
                <strong>أُعيد الإنشاء؟</strong>{" "}
                {wfResult.recreated ? "نعم" : "لا"}
              </Typography>
              <Typography variant="body2">
                <strong>تم التفعيل؟</strong> {wfResult.activated ? "نعم" : "لا"}
              </Typography>
            </>
          )}
        </Stack>
      </Paper>

      {/* Snackbar عام للصفحة */}
      <Snackbar
        open={snack.open}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      >
        <Alert severity={snack.type} variant="filled" sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
