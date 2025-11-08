'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { resetPasswordAction } from '@/lib/actions/auth';
import AuthLayout from '../layout';
import { CircularProgress, TextField, InputAdornment, IconButton } from '@mui/material';
import { Typography, Button } from '@mui/material';
import { Box } from '@mui/system';
import { useTheme } from '@mui/material/styles';
import { FaLock } from 'react-icons/fa';
import { RiEyeCloseLine } from 'react-icons/ri';
import { TfiEye } from 'react-icons/tfi';
import GradientIcon from '@/components/shared/GradientIcon';
import axiosInstance from '@/lib/axios';

const Schema = z
  .object({
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .refine((v) => !/\s/.test(v), 'لا يسمح بالمسافات')
      .refine(
        (v) => !/[<>"'`\\]/.test(v),
        'ممنوع استخدام الرموز < > " \' ` \\'
      ),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'كلمتا المرور غير متطابقتين',
  });
type Form = z.infer<typeof Schema>;

export default function ResetPasswordPage() {
  const t = useTranslations('auth.reset');
  const theme = useTheme();
  const searchParams = useSearchParams();
  const email = (searchParams?.get('email') || '').toLowerCase();
  const token = searchParams?.get('token') || '';
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await axiosInstance.get('/auth/reset-password/validate', {
          params: { email, token },
        });
        if (!ignore) {
          setValid(!!res.data?.valid);
          setChecking(false);
        }
      } catch {
        setValid(false);
        setChecking(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [email, token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Form>({ resolver: zodResolver(Schema) });

  const onSubmit = async ({ password }: Form) => {
    try {
      const result = await resetPasswordAction(token, password);
      if (result.success) {
        router.push('/ar/login?reset=success');
      } else {
        setError('confirm', { message: result.error || 'رابط إعادة التعيين غير صالح أو منتهي.' });
      }
    } catch {
      setError('confirm', { message: 'رابط إعادة التعيين غير صالح أو منتهي.' });
    }
  };

  if (checking)
    return (
      <AuthLayout title={<Typography variant="h4">التحقق...</Typography>}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </AuthLayout>
    );
  if (!valid)
    return (
      <AuthLayout title={<Typography variant="h4" color="error.main">رابط غير صالح</Typography>}>
        <Typography color="error.main" sx={{ textAlign: 'center' }}>
          الرابط غير صالح أو منتهي.
        </Typography>
      </AuthLayout>
    );

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
      <Box component="form" onSubmit={handleSubmit(onSubmit)} dir="rtl">
        <TextField
          {...register('password')}
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          error={!!errors.password}
          helperText={errors.password?.message || ''}
          fullWidth
          sx={{ mb: 3 }}
          autoComplete="new-password"
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
        <TextField
          {...register('confirm')}
          label={t('confirmPassword')}
          type={showConfirm ? 'text' : 'password'}
          error={!!errors.confirm}
          helperText={errors.confirm?.message || ''}
          fullWidth
          sx={{ mb: 4 }}
          autoComplete="new-password"
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
                  onClick={() => setShowConfirm((p) => !p)}
                  edge="end"
                  tabIndex={-1}
                  aria-label={
                    showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                  aria-pressed={showConfirm}
                >
                  {showConfirm ? (
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
          sx={{
            py: 1.5,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            fontWeight: 'bold',
          }}
        >
          {t('submit')}
        </Button>
      </Box>
    </AuthLayout>
  );
}

