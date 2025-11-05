'use client';

import { useEffect, useState } from 'react';
import { Button, Typography, CircularProgress, Alert } from '@mui/material';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';

import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import {
  getIntegrationsStatus,
  syncCatalog,
} from '@/features/onboarding/integrations-api';

// Temporary auth helpers
function useAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token');
}

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

export default function SyncPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('onboarding');
  const { enqueueSnackbar } = useSnackbar();

  const token = useAuthToken();
  const user = useUser();

  const [statusText, setStatusText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatusText(t('step3.readyToSync'));

    (async () => {
      if (!token || !user?.merchantId) return;
      try {
        const st = await getIntegrationsStatus(token);
        const connected = st.salla?.connected || st.zid?.connected;
        if (connected) {
          // External provider is connected
          // You can optionally auto-sync here
          // await handleSync();
        } else {
          setStatusText(t('step3.noExternalProvider'));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [token, user?.merchantId, t]);

  const handleSync = async () => {
    if (!user?.merchantId || !token) return;
    setError(null);
    setLoading(true);
    setImported(null);
    setUpdated(null);
    setStatusText(t('step3.syncing'));
    try {
      const res = await syncCatalog(user.merchantId, token);
      setImported(res.imported || 0);
      setUpdated(res.updated || 0);
      setStatusText(t('step3.syncComplete'));
      enqueueSnackbar(t('success.syncComplete'), { variant: 'success' });
    } catch (e: any) {
      const errorMsg =
        e.response?.data?.message || e.message || t('errors.syncFailed');
      setError(errorMsg);
      setStatusText(t('errors.syncFailed'));
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step={3}
      total={3}
      title={
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#502E91' }}>
          {t('step3.title')}
        </Typography>
      }
      subtitle={
        <Typography variant="body1" sx={{ color: '#8589A0' }}>
          {t('step3.subtitle')}
        </Typography>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography sx={{ color: '#7E66AC', mb: 2 }}>{statusText}</Typography>

      {imported !== null && updated !== null && (
        <Typography sx={{ color: '#8589A0', mb: 2 }}>
          {t('step3.syncStats', { imported, updated })}
        </Typography>
      )}

      <Button
        variant="contained"
        onClick={handleSync}
        disabled={loading}
        fullWidth
        sx={{
          fontWeight: 'bold',
          py: 1.5,
          borderRadius: 2,
          mb: 2,
          background: 'linear-gradient(90deg, #A498CB, #502E91)',
        }}
      >
        {loading ? (
          <CircularProgress size={22} color="inherit" />
        ) : (
          t('buttons.syncNow')
        )}
      </Button>

      <Button
        variant="outlined"
        onClick={() => router.push(`/${locale}/dashboard`)}
        fullWidth
        sx={{ fontWeight: 'bold', py: 1.5, borderRadius: 2 }}
      >
        {t('buttons.goToDashboard')}
      </Button>
    </OnboardingLayout>
  );
}

