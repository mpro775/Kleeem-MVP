'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Link as MuiLink,
  Alert,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { forgotPasswordAction } from '@/lib/actions/auth';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await forgotPasswordAction(email);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'فشل إرسال رابط إعادة التعيين');
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

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني
          </Alert>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              margin="normal"
              autoComplete="email"
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
          </form>
        )}

        <Box textAlign="center" mt={3}>
          <MuiLink
            component={Link}
            href="/ar/login"
            underline="hover"
            fontWeight={600}
          >
            {t('backToLogin')}
          </MuiLink>
        </Box>
      </CardContent>
    </Card>
  );
}

