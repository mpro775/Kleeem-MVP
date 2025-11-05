'use client';

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
} from '@mui/material';
import { useState } from 'react';
import { useSettings } from '@/features/merchant/settings-advanced/hooks/useSettings';
import { ensureN8nWorkflow } from '@/features/merchant/settings-advanced/api';
import { ProfileSettings } from '@/features/merchant/settings-advanced/ui/ProfileSettings';
import { SecuritySettings } from '@/features/merchant/settings-advanced/ui/SecuritySettings';

// Temporary auth helper
function useUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export default function SettingsAdvancedPage() {
  const user = useUser();
  const userId = user?.id ?? '';
  const merchantId = user?.merchantId ?? '';

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
        type: 'success',
        msg: `تم ${data.recreated ? 'إعادة إنشاء' : 'تأكيد'} ورِك-فلو n8n بنجاح (ID: ${data.workflowId})`,
      });
    } catch (e: unknown) {
      setSnack({
        open: true,
        type: 'error',
        msg: `فشل إصلاح ورِك-فلو n8n: ${(e as { message?: string })?.message || 'خطأ غير معروف'}`,
      });
    } finally {
      setWfEnsuring(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, m: 'auto', maxWidth: 1200 }}>
        <Typography sx={{ mb: 1 }}>جارِ تحميل الإعدادات…</Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        p: { xs: 2, md: 4 },
        display: 'grid',
        gap: 2,
      }}
    >
      <ProfileSettings
        profile={profile}
        onProfileChange={(field, value) =>
          setProfile((p) => ({ ...p, [field]: value }))
        }
        onSave={handleSaveProfile}
        isSaving={!!saving.profile}
      />

      <SecuritySettings
        onChangePassword={handleChangePassword}
        isSaving={!!saving.password}
      />

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
              {wfEnsuring ? 'جارِ الإصلاح…' : 'إصلاح/تأكيد ورِك-فلو n8n الآن'}
            </Button>
          </Stack>

          {wfResult && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2">
                <strong>Workflow ID:</strong> {wfResult.workflowId}
              </Typography>
              <Typography variant="body2">
                <strong>أُعيد الإنشاء؟</strong>{' '}
                {wfResult.recreated ? 'نعم' : 'لا'}
              </Typography>
              <Typography variant="body2">
                <strong>تم التفعيل؟</strong> {wfResult.activated ? 'نعم' : 'لا'}
              </Typography>
            </>
          )}
        </Stack>
      </Paper>

      <Snackbar
        open={snack.open}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      >
        <Alert severity={snack.type} variant="filled" sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
