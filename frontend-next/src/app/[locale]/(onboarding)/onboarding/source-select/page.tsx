'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';

import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import axiosInstance from '@/lib/axios';
import type { IntegrationsStatus } from '@/features/onboarding/types';

type Source = 'internal' | 'salla' | 'zid';

const isExternal = (s: IntegrationsStatus) =>
  s.productSource === 'salla' || s.productSource === 'zid';

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

export default function SourceSelectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const t = useTranslations('onboarding');
  const { enqueueSnackbar } = useSnackbar();

  const token = useAuthToken();
  const user = useUser();

  const [source, setSource] = useState<Source>('internal');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<null | 'salla' | 'zid'>(null);
  const [status, setStatus] = useState<IntegrationsStatus>({
    productSource: 'internal',
    skipped: true,
  });
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const stopPolling = () => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    const installParam = searchParams.get('install');
    if (installParam === 'zid') {
      setSource('zid');
      // Auto-trigger connection
      setTimeout(() => {
        handleContinue();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setProductSource = async (src: Source) => {
    if (!user?.merchantId) return;
    await axiosInstance.patch(
      `${API_BASE}/merchants/${user.merchantId}/product-source`,
      { source: src },
      { headers }
    );
  };

  const fetchStatus = async (src: Source): Promise<IntegrationsStatus> => {
    if (src === 'internal') return { productSource: 'internal', skipped: true };
    try {
      const { data } = await axiosInstance.get<IntegrationsStatus>(
        `${API_BASE}/integrations/status`,
        { headers }
      );
      setStatus(data);
      return data;
    } catch {
      return { productSource: 'internal', skipped: true };
    }
  };

  const handleContinue = async () => {
    setError(null);
    try {
      setSaving(true);

      // For internal source, just set it and navigate
      if (source === 'internal') {
        await setProductSource(source);
        enqueueSnackbar(t('success.sourceSet'), { variant: 'success' });
        router.push(`/${locale}/dashboard`);
        return;
      }

      // For external providers (Salla/Zid)
      setConnecting(source);
      const url = `${API_BASE}/integrations/${source}/connect`;
      const popup = window.open(url, '_blank', 'noopener,noreferrer');

      await fetchStatus(source);

      // Listen for postMessage from callback
      const onMsg = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.provider === source && e.data?.connected) {
          stopPolling();
          setConnecting(null);
          popup?.close?.();
          enqueueSnackbar(t('success.connected'), { variant: 'success' });
          router.push(`/${locale}/onboarding/sync`);
        }
      };
      window.addEventListener('message', onMsg);

      // Poll for status updates
      pollTimer.current = window.setInterval(async () => {
        const st = await fetchStatus(source);
        const ok =
          isExternal(st) &&
          (source === 'salla' ? !!st.salla?.connected : !!st.zid?.connected);
        if (ok) {
          stopPolling();
          window.removeEventListener('message', onMsg);
          setConnecting(null);
          enqueueSnackbar(t('success.connected'), { variant: 'success' });
          router.push(`/${locale}/onboarding/sync`);
        }
      }, 2000);
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message || t('errors.unexpectedError');
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={2}
      total={3}
      title={
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#502E91' }}>
          {t('step2.title')}
        </Typography>
      }
      subtitle={
        <Typography variant="body1" sx={{ color: '#8589A0' }}>
          {t('step2.subtitle')}
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
        sx={{ textAlign: 'left', mx: 'auto', width: 'fit-content' }}
      >
        <FormControlLabel
          value="internal"
          control={<Radio />}
          label={t('sources.internal')}
        />
        <FormControlLabel
          value="salla"
          control={<Radio />}
          label={t('sources.salla')}
        />
        <FormControlLabel value="zid" control={<Radio />} label={t('sources.zid')} />
      </RadioGroup>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleContinue}
          disabled={saving || !!connecting}
          sx={{
            fontWeight: 'bold',
            py: 1.7,
            fontSize: 18,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #A498CB, #502E91)',
          }}
        >
          {saving ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            t('buttons.continue')
          )}
        </Button>
      </Box>

      {connecting && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography sx={{ color: '#8589A0', mb: 1 }}>
            {t('info.connecting', {
              provider: connecting === 'salla' ? t('sources.salla') : t('sources.zid'),
            })}
          </Typography>
          <CircularProgress />
          <Typography variant="body2" sx={{ color: '#A498CB', mt: 1 }}>
            {t('info.keepPageOpen')}
          </Typography>
        </Box>
      )}

      {isExternal(status) && (status.salla || status.zid) && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#8589A0' }}>
            {t('info.statusSalla')}: {status.salla?.connected ? t('connected') : t('notConnected')} —{' '}
            {t('info.statusZid')}: {status.zid?.connected ? t('connected') : t('notConnected')}
          </Typography>
        </Box>
      )}
    </OnboardingLayout>
  );
}

