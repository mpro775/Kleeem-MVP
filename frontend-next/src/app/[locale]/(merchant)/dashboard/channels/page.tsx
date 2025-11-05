'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Skeleton,
  Snackbar,
  Alert,
  useTheme,
} from '@mui/material';
import {
  WhatsApp,
  Telegram,
  Chat,
  Instagram,
  Facebook,
  QrCode2,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';

import { CHANNELS } from '@/features/merchant/channels/constants';
import { useChannels, useUpdateChannel, useDeleteChannel } from '@/features/merchant/channels';
import { ChannelCard } from '@/features/merchant/channels/components/ChannelCard';
import type { ChannelKey, ChannelDoc } from '@/features/merchant/channels/types';

// Temporary mock merchantId (should come from auth context)
const MOCK_MERCHANT_ID = 'merchant-123';

export default function ChannelsPage() {
  const t = useTranslations('channels');
  const theme = useTheme();

  const { data: channelsList = [], isLoading, refetch } = useChannels(MOCK_MERCHANT_ID);
  const updateChannelMutation = useUpdateChannel(MOCK_MERCHANT_ID);
  const deleteChannelMutation = useDeleteChannel(MOCK_MERCHANT_ID);

  const [busyKey, setBusyKey] = useState<ChannelKey | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const ICONS = useMemo(
    () => ({
      telegram: <Telegram fontSize="large" />,
      whatsappQr: <QrCode2 fontSize="large" />,
      webchat: <Chat fontSize="large" />,
      whatsappApi: <WhatsApp fontSize="large" />,
      instagram: <Instagram fontSize="large" />,
      messenger: <Facebook fontSize="large" />,
    }),
    []
  );

  const byKey = useMemo(() => {
    const map: Record<ChannelKey, ChannelDoc | undefined> = {
      telegram: undefined,
      whatsappQr: undefined,
      whatsappApi: undefined,
      webchat: undefined,
      instagram: undefined,
      messenger: undefined,
    };

    channelsList.forEach((channel: ChannelDoc) => {
      const key = channel.provider.replace('_', '') as ChannelKey;
      map[key as ChannelKey] = channel;
    });

    return map;
  }, [channelsList]);

  const handleToggle = async (key: ChannelKey, wantEnabled: boolean) => {
    if (busyKey) return;
    setBusyKey(key);

    try {
      const channel = byKey[key];
      
      if (!wantEnabled && channel) {
        await deleteChannelMutation.mutateAsync({
          channelId: channel._id,
          mode: 'disable',
        });
        setToast({ msg: t('messages.disabled'), type: 'success' });
      } else {
        setToast({ msg: t('messages.comingSoon'), type: 'success' });
      }
      
      await refetch();
    } catch (error) {
      setToast({ msg: t('messages.error'), type: 'error' });
    } finally {
      setBusyKey(null);
    }
  };

  const comingSoon = (key: ChannelKey) => ['instagram', 'messenger'].includes(key);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {t('title')}
      </Typography>

      <Stack
        direction="row"
        flexWrap="wrap"
        gap={2}
        justifyContent={{ xs: 'center', md: 'flex-start' }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ flex: '1 1 260px', minWidth: 260, maxWidth: 340 }}>
                <Skeleton variant="rounded" height={200} />
              </Box>
            ))
          : CHANNELS.map((ch) => {
              const doc = byKey[ch.key];
              const enabled = !!doc?.enabled;
              const status = doc?.status;

              const statusColor =
                status === 'connected'
                  ? theme.palette.success.main
                  : status === 'pending'
                  ? theme.palette.warning.main
                  : status === 'disconnected'
                  ? theme.palette.error.main
                  : undefined;

              return (
                <Box
                  key={ch.key}
                  sx={{
                    flex: '1 1 260px',
                    minWidth: 260,
                    maxWidth: 340,
                  }}
                >
                  <ChannelCard
                    icon={ICONS[ch.key]}
                    title={`${ch.title}${status ? ` (${status})` : ''}`}
                    enabled={enabled}
                    isLoading={busyKey === ch.key}
                    onToggle={(checked) => handleToggle(ch.key, checked)}
                    onDetails={() => {}}
                    statusColor={statusColor}
                    onClick={() => {}}
                    disabled={comingSoon(ch.key)}
                  />
                </Box>
              );
            })}
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.type}>{toast.msg}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
}
