'use client';

import { Box, Button, Typography, CircularProgress, Link } from '@mui/material';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTheme } from '@mui/material/styles';
import AuthLayout from '../layout';
import OtpInputBoxes from '@/components/shared/OtpInputBoxes';
import { verifyEmailAction } from '@/lib/actions/auth';
import axiosInstance from '@/lib/axios';
import { useSnackbar } from 'notistack';

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verify');
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  
  const emailParam = searchParams?.get('email');
  const codeParam = searchParams?.get('code');
  const initialCode = codeParam || '';
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-verify if code and email are in URL
  useEffect(() => {
    const run = async () => {
      if (emailParam && codeParam && codeParam.length === 6) {
        try {
          const result = await verifyEmailAction(codeParam);
          if (result.success) {
            enqueueSnackbar('✔️ تم تفعيل حسابك بنجاح', { variant: 'success' });
            setSuccess(true);
            startCountdown();
          } else {
            enqueueSnackbar(result.error || 'تعذر تفعيل الحساب', { variant: 'error' });
          }
        } catch (e) {
          enqueueSnackbar('تعذر تفعيل الحساب', { variant: 'error' });
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam, codeParam]);

  const verify = async (verificationCode: string) => {
    try {
      setLoading(true);
      const result = await verifyEmailAction(verificationCode);
      
      if (result.success) {
        enqueueSnackbar('✔️ تم تفعيل حسابك بنجاح', { variant: 'success' });
        setSuccess(true);
        startCountdown();
      } else {
        enqueueSnackbar(result.error || 'حدث خطأ غير متوقع', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('حدث خطأ غير متوقع', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    let counter = 5;
    setCountdown(counter);
    const t = setInterval(() => {
      counter -= 1;
      setCountdown(counter);
      if (counter <= 0) {
        clearInterval(t);
        router.push('/ar/onboarding');
      }
    }, 1000);
  };

  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      verify(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const handleSubmit = () => {
    if (code.trim().length === 6) {
      verify(code.trim());
    } else {
      enqueueSnackbar('الرجاء إدخال رمز مكون من 6 أرقام', { variant: 'warning' });
    }
  };

  const handleResendCode = async () => {
    const email =
      emailParam ||
      typeof window !== 'undefined'
        ? localStorage.getItem('pendingEmail') || sessionStorage.getItem('pendingEmail')
        : null;
        
    if (!email) {
      enqueueSnackbar('لا يوجد عنوان بريد مسجّل', { variant: 'error' });
      return;
    }
    
    if (resendCooldown > 0) return;
    
    try {
      setLoading(true);
      await axiosInstance.post('/auth/resend-verification', { email });
      enqueueSnackbar('📧 تم إعادة إرسال كود التفعيل إلى بريدك', { variant: 'success' });
      setResendCooldown(60);
      const t = setInterval(
        () =>
          setResendCooldown((s) => {
            if (s <= 1) {
              clearInterval(t);
              return 0;
            }
            return s - 1;
          }),
        1000
      );
    } catch (err) {
      enqueueSnackbar('❌ فشل في إعادة إرسال الكود', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
        <Typography variant="body1" color="text.secondary">
          {t('subtitle')}
        </Typography>
      }
    >
      {!success ? (
        <>
          <OtpInputBoxes
            value={code}
            onChange={(v) => setCode(v.slice(0, 6))}
            disabled={loading}
            autoFocus
            onComplete={(v) => {
              setCode(v);
              verify(v);
            }}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{
              fontWeight: 'bold',
              py: 1.4,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              boxShadow: '0 3px 12px 0 rgba(80,46,145,0.13)',
              mt: 3,
            }}
            disabled={loading || code.trim().length !== 6}
            onClick={handleSubmit}
          >
            {loading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              t('submit')
            )}
          </Button>

          <Box
            sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}
          >
            <Link
              component="button"
              onClick={handleResendCode}
              disabled={loading || resendCooldown > 0}
              sx={{
                color: theme.palette.primary.dark,
                fontWeight: 'bold',
                fontSize: 15,
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                opacity: resendCooldown > 0 ? 0.5 : 1,
              }}
            >
              {resendCooldown
                ? `${t('resend')} (${resendCooldown}s)`
                : t('resend')}
            </Link>
            <span style={{ color: '#A498CB' }}>|</span>
            <Link
              component="button"
              onClick={() => router.push('/ar/login')}
              sx={{
                color: theme.palette.primary.dark,
                fontWeight: 'bold',
                fontSize: 15,
              }}
            >
              تسجيل الدخول
            </Link>
          </Box>
          <Typography
            variant="body2"
            sx={{ mt: 3, color: '#8589A0', fontSize: 13, textAlign: 'center' }}
          >
            لم تستلم الكود؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)
          </Typography>
        </>
      ) : (
        <Box sx={{ my: 3, textAlign: 'center' }}>
          <CheckCircleOutlineIcon
            color="success"
            sx={{ fontSize: 60, mb: 2 }}
          />
          <Typography variant="h6" sx={{ color: 'success.main', mb: 1 }}>
            تم تفعيل حسابك بنجاح!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            سيتم تحويلك تلقائيًا خلال {countdown} ثانية
          </Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={() => router.push('/ar/onboarding')}
            sx={{ mt: 3, fontWeight: 'bold', py: 1.4, borderRadius: 2 }}
          >
            الانتقال الآن
          </Button>
        </Box>
      )}
    </AuthLayout>
  );
}

