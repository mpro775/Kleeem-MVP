'use client';

import { Box, Typography, CircularProgress, Alert, Paper, Switch, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLeads, useLeadsSettings, useUpdateLeadsSettings } from '@/features/merchant/leads';
import { LeadsTable } from '@/features/merchant/leads/components/LeadsTable';

const MOCK_MERCHANT_ID = 'merchant-123';

export default function LeadsPage() {
  const t = useTranslations('leads');

  const { data: leads = [], isLoading: leadsLoading } = useLeads(MOCK_MERCHANT_ID);
  const { data: settings, isLoading: settingsLoading } = useLeadsSettings(MOCK_MERCHANT_ID);
  const updateSettingsMutation = useUpdateLeadsSettings(MOCK_MERCHANT_ID);

  const isLoading = leadsLoading || settingsLoading;

  const handleToggle = async (checked: boolean) => {
    if (!settings) return;
    await updateSettingsMutation.mutateAsync({
      ...settings,
      enabled: checked,
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {t('title')}
      </Typography>

      {/* Enable Toggle */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {t('settings.enableLeads')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('settings.enableDescription')}
            </Typography>
          </Box>
          <Switch
            checked={settings?.enabled || false}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={updateSettingsMutation.isPending}
          />
        </Stack>
      </Paper>

      {/* Leads Table */}
      {settings?.enabled ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" fontWeight={700} mb={2}>
            {t('table.title')}
          </Typography>
          <LeadsTable leads={leads} fields={settings?.fields || []} />
        </Paper>
      ) : (
        <Alert severity="info">{t('messages.disabled')}</Alert>
      )}
    </Box>
  );
}
