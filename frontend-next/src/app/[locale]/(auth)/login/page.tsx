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
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginAction } from '@/lib/actions/auth';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(formData);

    setLoading(false);

    if (result.success) {
      router.push('/ar/dashboard');
    } else {
      setError(result.error || 'فشل تسجيل الدخول');
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
            label={t('email')}
            name="email"
            type="email"
            required
            margin="normal"
            autoComplete="email"
          />
          <TextField
            fullWidth
            label={t('password')}
            name="password"
            type="password"
            required
            margin="normal"
            autoComplete="current-password"
          />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={1}
            mb={2}
          >
            <FormControlLabel
              control={<Checkbox name="rememberMe" />}
              label={t('rememberMe')}
            />
            <MuiLink
              component={Link}
              href="/ar/forgot-password"
              variant="body2"
              underline="hover"
            >
              {t('forgotPassword')}
            </MuiLink>
          </Box>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? 'جارِ التحميل...' : t('submit')}
          </Button>
        </form>

        <Box textAlign="center" mt={3}>
          <Typography variant="body2" color="text.secondary">
            {t('noAccount')}{' '}
            <MuiLink
              component={Link}
              href="/ar/signup"
              underline="hover"
              fontWeight={600}
            >
              {t('signupLink')}
            </MuiLink>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

