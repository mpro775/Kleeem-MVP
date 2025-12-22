'use client';

/**
 * OTP Verify Page
 * @description Page for verifying OTP code and completing authentication
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowBack, Refresh } from '@mui/icons-material';

export default function OtpVerifyPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();

  const contact = searchParams.get('contact') || '';
  const contactType = searchParams.get('type') || 'phone';

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual API call
      console.log('Verifying OTP:', otp, 'for contact:', contact);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess(true);

      // Redirect to store after successful verification
      setTimeout(() => {
        router.push('/store');
      }, 1500);

    } catch (err) {
      setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setResendCooldown(60); // 60 seconds cooldown

    try {
      // TODO: Implement actual resend API call
      console.log('Resending OTP to:', contact);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      setError('فشل في إعادة إرسال رمز التحقق');
    }
  };

  const maskContact = (contact: string, type: string) => {
    if (type === 'email') {
      const [local, domain] = contact.split('@');
      if (local.length <= 2) return `${local}***@${domain}`;
      return `${local.slice(0, 2)}***@${domain}`;
    } else {
      // phone
      if (contact.length <= 4) return '****';
      return `${contact.slice(0, 2)}****${contact.slice(-2)}`;
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              width: '100%',
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" sx={{ mb: 2, color: 'success.main' }}>
              ✅ تم التحقق بنجاح
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              مرحباً بك! تم تسجيل دخولك بنجاح.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جاري التوجيه إلى المتجر...
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.back()}
              sx={{ mb: 2 }}
            >
              رجوع
            </Button>
          </Box>

          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 2,
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            التحقق من رمز الدخول
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            تم إرسال رمز التحقق المكون من 6 أرقام إلى
            <br />
            <strong>{maskContact(contact, contactType)}</strong>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="رمز التحقق"
              placeholder="123456"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                if (error) setError('');
              }}
              disabled={isLoading}
              sx={{ mb: 3 }}
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  letterSpacing: '0.5rem',
                  fontWeight: 'bold',
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || otp.length !== 6}
              sx={{
                mb: 3,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'تحقق والدخول'
              )}
            </Button>
          </Box>

          <Stack spacing={2} sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              لم تستلم الرمز؟
            </Typography>

            <Button
              variant="text"
              startIcon={<Refresh />}
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isLoading}
              sx={{ fontSize: '0.9rem' }}
            >
              {resendCooldown > 0
                ? `إعادة الإرسال خلال ${resendCooldown} ثانية`
                : 'إعادة إرسال الرمز'
              }
            </Button>

            <Link
              href="/store/auth/otp/send"
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              تجربة طريقة تواصل أخرى
            </Link>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
