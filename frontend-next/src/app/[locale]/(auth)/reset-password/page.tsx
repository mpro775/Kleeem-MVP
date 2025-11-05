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
  Stack,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordAction } from '@/lib/actions/auth';

export default function ResetPasswordPage() {
  const t = useTranslations('auth.reset');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }
    
    setLoading(true);
    setError('');

    const result = await resetPasswordAction(token, password);
    setLoading(false);

    if (result.success) {
      router.push('/ar/login');
    } else {
      setError(result.error || 'فشل إعادة تعيين كلمة المرور');
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
          <Stack spacing={2}>
            <TextField
              fullWidth
              label={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label={t('confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
              autoComplete="new-password"
            />
          </Stack>

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
      </CardContent>
    </Card>
  );
}

