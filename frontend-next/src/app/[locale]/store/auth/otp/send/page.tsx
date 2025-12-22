'use client';

/**
 * OTP Send Page
 * @description Page for sending OTP to customer for authentication
 */

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Email, Phone } from '@mui/icons-material';

export default function OtpSendPage() {
  const t = useTranslations('auth');
  const router = useRouter();

  const [contact, setContact] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact.trim()) {
      setError('يرجى إدخال معلومات التواصل');
      return;
    }

    // Basic validation
    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        setError('يرجى إدخال بريد إلكتروني صحيح');
        return;
      }
    } else {
      // Basic phone validation
      const phoneRegex = /^(\+966|0)?[5][0-9]{8}$/;
      if (!phoneRegex.test(contact.replace(/\s+/g, ''))) {
        setError('يرجى إدخال رقم هاتف سعودي صحيح');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual API call
      console.log('Sending OTP to:', contact, 'type:', contactType);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess(true);

      // Redirect to verify page after short delay
      setTimeout(() => {
        router.push(`/store/auth/otp/verify?contact=${encodeURIComponent(contact)}&type=${contactType}`);
      }, 1500);

    } catch (err) {
      setError('حدث خطأ في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactTypeChange = (type: 'email' | 'phone') => {
    setContactType(type);
    setContact('');
    setError('');
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
              ✅ تم إرسال رمز التحقق
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              تم إرسال رمز التحقق إلى {contact}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جاري التوجيه إلى صفحة التحقق...
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
          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 2,
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            تسجيل الدخول
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            أدخل بريدك الإلكتروني أو رقم هاتفك لتلقي رمز التحقق
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'medium' }}>
                اختر طريقة التواصل:
              </FormLabel>
              <RadioGroup
                row
                value={contactType}
                onChange={(e) => handleContactTypeChange(e.target.value as 'email' | 'phone')}
                sx={{ justifyContent: 'center', gap: 4 }}
              >
                <FormControlLabel
                  value="phone"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone />
                      رقم الهاتف
                    </Box>
                  }
                />
                <FormControlLabel
                  value="email"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email />
                      البريد الإلكتروني
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label={
                contactType === 'email'
                  ? 'البريد الإلكتروني'
                  : 'رقم الهاتف'
              }
              placeholder={
                contactType === 'email'
                  ? 'example@email.com'
                  : '+966501234567'
              }
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={isLoading}
              sx={{ mb: 3 }}
              inputProps={{
                dir: 'ltr',
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !contact.trim()}
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
                'إرسال رمز التحقق'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                href="/store"
                variant="body2"
                sx={{ color: 'text.secondary' }}
              >
                العودة إلى المتجر
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
