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
  Stack,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signupAction } from '@/lib/actions/auth';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    
    // Validate password match
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      setLoading(false);
      return;
    }

    const result = await signupAction(formData);
    setLoading(false);

    if (result.success) {
      router.push('/ar/verify-email');
    } else {
      setError(result.error || 'فشل إنشاء الحساب');
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
              label={t('name')}
              name="name"
              required
              autoComplete="name"
            />
            <TextField
              fullWidth
              label={t('email')}
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label={t('phone')}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
            />
            <TextField
              fullWidth
              label={t('storeName')}
              name="storeName"
              required
            />
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label={t('password')}
                name="password"
                type="password"
                required
                autoComplete="new-password"
              />
              <TextField
                fullWidth
                label={t('confirmPassword')}
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
            </Box>
          </Stack>

          <Box mt={2} mb={3}>
            <FormControlLabel
              control={<Checkbox required />}
              label={
                <Typography variant="body2">
                  {t('agree')}{' '}
                  <MuiLink href="#" underline="hover">
                    {t('terms')}
                  </MuiLink>
                </Typography>
              }
            />
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
            {t('hasAccount')}{' '}
            <MuiLink
              component={Link}
              href="/ar/login"
              underline="hover"
              fontWeight={600}
            >
              {t('loginLink')}
            </MuiLink>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

