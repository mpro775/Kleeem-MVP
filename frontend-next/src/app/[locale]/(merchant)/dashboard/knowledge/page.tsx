'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Stack,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslations } from 'next-intl';
import { useFaqs, useDocs, useLinks } from '@/features/merchant/knowledge';
import { FaqsList } from '@/features/merchant/knowledge/components/FaqsList';
import type { FaqItem } from '@/features/merchant/knowledge/types';

const MOCK_MERCHANT_ID = 'merchant-123';

export default function KnowledgePage() {
  const t = useTranslations('knowledge');
  const [tab, setTab] = useState(0);

  const { data: faqs = [], isLoading: faqsLoading } = useFaqs(MOCK_MERCHANT_ID);
  const { data: docs = [], isLoading: docsLoading } = useDocs(MOCK_MERCHANT_ID);
  const { data: links = [], isLoading: linksLoading } = useLinks(MOCK_MERCHANT_ID);

  const isLoading = faqsLoading || docsLoading || linksLoading;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" fontWeight="bold">
          {t('title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          {t('actions.addFaq')}
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('tabs.faqs')} />
        <Tab label={t('tabs.docs')} />
        <Tab label={t('tabs.links')} />
      </Tabs>

      {tab === 0 && <FaqsList faqs={faqs} />}
      
      {tab === 1 && (
        <Alert severity="info">{t('messages.comingSoon')}</Alert>
      )}
      
      {tab === 2 && (
        <Alert severity="info">{t('messages.comingSoon')}</Alert>
      )}
    </Box>
  );
}
