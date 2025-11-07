'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import { RiEyeCloseLine } from 'react-icons/ri';
import { TfiEye } from 'react-icons/tfi';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginAction } from '@/lib/actions/auth';
import AuthLayout from '../layout';
import GradientIcon from '@/components/shared/GradientIcon';

const forbidsHtml = (v: string) => !/<[^>]*>/.test(v) && !/[<>]/.test(v);
const sanitize = (v: string) => v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('بريد إلكتروني غير صحيح')
    .refine(forbidsHtml, 'ممنوع إدخال وسوم HTML'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .refine((v) => !/\s/.test(v), 'كلمة المرور لا يجب أن تحتوي مسافات')
    .refine((v) => !/[<>"'`\\]/.test(v), 'ممنوع استخدام الرموز < > " \' ` \\'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get('redirect');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);

      const result = await loginAction(formData);

      if (result.success) {
        const redirectPath = rawRedirect || '/ar/dashboard';
        router.push(redirectPath);
      } else {
        setError(result.error || t('errors.invalidCredentials'));
      }
    } catch (err) {
      setError(t('errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const signUpHref = rawRedirect
    ? `/ar/signup?redirect=${encodeURIComponent(rawRedirect)}`
    : '/ar/signup';

  return (
    <AuthLayout
      title={
        <Typography
          variant="h4"
          fontWeight="bold"
          color={theme.palette.primary.dark}
        >
          {t('title')}
        </Typography>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        dir="rtl"
      >
        <TextField
          {...register('email')}
          label={t('email')}
          fullWidth
          sx={{ mb: 3 }}
          error={!!errors.email}
          onChange={(e) => {
            const v = sanitize(e.target.value);
            e.target.value = v;
          }}
          helperText={errors.email?.message || ''}
          inputProps={{
            inputMode: 'email',
            autoCapitalize: 'none',
            maxLength: 254,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" aria-hidden>
                <GradientIcon
                  Icon={FaEnvelope}
                  size={22}
                  startColor={theme.palette.primary.dark}
                  endColor={theme.palette.primary.main}
                />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          {...register('password')}
          onChange={(e) => {
            const v = e.target.value
              .replace(/<[^>]*>/g, '')
              .replace(/[<>]/g, '');
            e.target.value = v;
          }}
          inputProps={{ maxLength: 128 }}
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          fullWidth
          sx={{ mb: 4 }}
          error={!!errors.password}
          helperText={errors.password?.message || ''}
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" aria-hidden>
                <GradientIcon
                  Icon={FaLock}
                  size={22}
                  startColor={theme.palette.primary.dark}
                  endColor={theme.palette.primary.main}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((p) => !p)}
                  edge="end"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <GradientIcon
                      Icon={TfiEye}
                      size={18}
                      startColor={theme.palette.primary.dark}
                      endColor={theme.palette.primary.main}
                    />
                  ) : (
                    <GradientIcon
                      Icon={RiEyeCloseLine}
                      size={18}
                      startColor={theme.palette.primary.dark}
                      endColor={theme.palette.primary.main}
                    />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{
            py: 1.5,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            fontWeight: 'bold',
          }}
        >
          {loading ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            t('submit')
          )}
        </Button>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 2, color: 'text.secondary' }}
        >
          <Link
            component={NextLink}
            href="/ar/forgot-password"
            underline="hover"
            color="primary"
          >
            {t('forgotPassword')}
          </Link>
        </Typography>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 2, color: 'text.secondary' }}
        >
          {t('noAccount')}{' '}
          <Link
            component={NextLink}
            href={signUpHref}
            underline="hover"
            color="primary"
          >
            {t('signupLink')}
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}

