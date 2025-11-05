'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Stack,
} from '@mui/material';
import { Email, Phone, LocationOn, Send } from '@mui/icons-material';
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const t = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" fontWeight={800} gutterBottom>
            تواصل معنا
          </Typography>
          <Typography variant="h6" color="text.secondary">
            نحن هنا لمساعدتك. تواصل معنا في أي وقت
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
          }}
        >
          {/* Contact Information */}
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              معلومات التواصل
            </Typography>
            <Stack spacing={3} mt={3}>
              <Paper sx={{ p: 3, display: 'flex', gap: 2 }}>
                <Email sx={{ color: 'primary.main', fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    البريد الإلكتروني
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    support@kaleem-ai.com
                  </Typography>
                </Box>
              </Paper>
              <Paper sx={{ p: 3, display: 'flex', gap: 2 }}>
                <Phone sx={{ color: 'primary.main', fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    الهاتف
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    +966 XX XXX XXXX
                  </Typography>
                </Box>
              </Paper>
              <Paper sx={{ p: 3, display: 'flex', gap: 2 }}>
                <LocationOn sx={{ color: 'primary.main', fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    الموقع
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    الرياض، المملكة العربية السعودية
                  </Typography>
                </Box>
              </Paper>
            </Stack>
          </Box>

          {/* Contact Form */}
          <Paper sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              أرسل لنا رسالة
            </Typography>
            
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                تم إرسال رسالتك بنجاح. سنتواصل معك قريباً!
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="الاسم الكامل"
                  name="name"
                  required
                />
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  required
                />
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  name="phone"
                  type="tel"
                />
                <TextField
                  fullWidth
                  label="الموضوع"
                  name="subject"
                  required
                />
                <TextField
                  fullWidth
                  label="الرسالة"
                  name="message"
                  multiline
                  rows={4}
                  required
                />
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<Send />}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'جارِ الإرسال...' : 'إرسال الرسالة'}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

