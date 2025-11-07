'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FaEnvelope } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordAction } from '@/lib/actions/auth';
import AuthLayout from '../layout';
import GradientIcon from '@/components/shared/GradientIcon';
import { enqueueSnackbar } from 'notistack';

const forbidsHtml = (v: string) => !/<[^>]*>/.test(v) && !/[<>]/.test(v);
const sanitize = (v: string) => v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('بريد إلكتروني غير صحيح')
    .refine(forbidsHtml, 'ممنوع إدخال وسوم HTML'),
});

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      await forgotPasswordAction(data.email);
      setSent(true);
    } catch (err: unknown) {

      const error = err as Error;
      const errorMsg = error.message || t('errors.generic');
      enqueueSnackbar(errorMsg, { variant: 'error' });
      // Handle error silently or show notification
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title={
          <Typography
            variant="h4"
            fontWeight="bold"
            color={theme.palette.primary.dark}
          >
            تحقق من بريدك الإلكتروني
          </Typography>
        }
        subtitle={
          <Typography variant="body2" color="text.secondary">
            تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
          </Typography>
        }
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="success.main" sx={{ mb: 3 }}>
            إن كان البريد صحيحًا فستصلك رسالة خلال لحظات.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            لم تصلك الرسالة؟ تحقق من مجلد الرسائل المزعجة أو جرب مرة أخرى.
          </Typography>
          <Link
            component={NextLink}
            href="/ar/login"
            underline="hover"
            color="primary"
          >
            {t('backToLogin')}
          </Link>
        </Box>
      </AuthLayout>
    );
  }

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
          sx={{ mb: 4 }}
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
          sx={{ mt: 3, color: 'text.secondary' }}
        >
          تذكرت كلمة المرور؟{' '}
          <Link
            component={NextLink}
            href="/ar/login"
            underline="hover"
            color="primary"
          >
            {t('backToLogin')}
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}

