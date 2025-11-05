'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { verifyEmailAction } from '@/lib/actions/auth';

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verify');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await verifyEmailAction(code);
    setLoading(false);

    if (result.success) {
      router.push('/ar/dashboard');
    } else {
      setError(result.error || 'رمز التحقق غير صحيح');
    }
  };

  return (
    <Card elevation={10}>
      <CardContent sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('code')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            margin="normal"
            inputProps={{ maxLength: 6 }}
            autoComplete="off"
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.5, mt: 3 }}
          >
            {loading ? 'جارِ التحميل...' : t('submit')}
          </Button>

          <Box textAlign="center" mt={2}>
            <Button variant="text" size="small">
              {t('resend')}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}

