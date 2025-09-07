import  {  useState } from 'react';
import { Paper, Stack, Typography, Grid, TextField, MenuItem, Button, LinearProgress, Alert, Collapse, Tooltip, IconButton, FormHelperText } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, ContactTopic, type ContactPayload, type ContactResponse, type ContactConfig } from '../types';
import { submitContact } from '../api/supportApi';

const topics = [
  { value: ContactTopic.SALES, label: 'مبيعات' },
  { value: ContactTopic.SUPPORT, label: 'دعم فني' },
  { value: ContactTopic.BILLING, label: 'فواتير' },
  { value: ContactTopic.PARTNERSHIP, label: 'شركات/شراكات' },
];

export default function ContactForm({  onSuccess }: { config: ContactConfig; onSuccess?: (r: ContactResponse) => void }) {
  const theme = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ContactPayload>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '', website: '', topic: '' } as any,
    mode: 'onBlur',
  });

  const onSubmit = async (values: ContactPayload) => {
    try {
      setError(null); setSubmitting(true); setSent(false);
      if (values.website && values.website.trim() !== '') throw new Error('Spam detected');
      const res = await submitContact(values, files);
      setSent(true);
      reset(); setFiles(null);
      onSuccess?.(res);
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ غير متوقع');
    } finally { setSubmitting(false); }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <SupportAgentIcon />
        <Typography variant="h6" fontWeight={800}>أرسل لنا رسالة</Typography>
      </Stack>

      <Collapse in={!!error}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert></Collapse>
      <Collapse in={sent}><Alert icon={<CheckCircleRoundedIcon fontSize="inherit" />} severity="success" sx={{ mb: 2 }}>تم استلام رسالتك بنجاح. سنعاودك قريباً.</Alert></Collapse>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2}>
          <Grid size={{xs:12, md:6}}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField {...field} label="الاسم الكامل" fullWidth error={!!errors.name} helperText={errors.name?.message} />
            )} />
          </Grid>
          <Grid size={{xs:12, md:6}}>
            <Controller name="email" control={control} render={({ field }) => (
              <TextField {...field} label="البريد الإلكتروني" type="email" fullWidth error={!!errors.email} helperText={errors.email?.message} />
            )} />
          </Grid>
          <Grid size={{xs:12, md:6}}>
            <Controller name="phone" control={control} render={({ field }) => (
              <TextField {...field} label="رقم الهاتف (اختياري)" fullWidth />
            )} />
          </Grid>
          <Grid size={{xs:12, md:6}}>
            <Controller name="topic" control={control} render={({ field }) => (
              <TextField {...field} select label="نوع الطلب" fullWidth error={!!errors.topic} helperText={errors.topic?.message}>
                {topics.map((t) => (<MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>))}
              </TextField>
            )} />
          </Grid>
          <Grid size={{xs:12}}>
            <Controller name="subject" control={control} render={({ field }) => (
              <TextField {...field} label="الموضوع" fullWidth error={!!errors.subject} helperText={errors.subject?.message} />
            )} />
          </Grid>
          <Grid size={{xs:12}}>
            <Controller name="message" control={control} render={({ field }) => (
              <TextField {...field} label="نص الرسالة" fullWidth multiline minRows={6} error={!!errors.message} helperText={errors.message?.message} />
            )} />
          </Grid>

          {/* مرفقات */}
          <Grid size={{xs:12}}>
            <Button component="label" variant="outlined" sx={{ borderRadius: 2 }}>
              إرفاق ملفات (اختياري)
              <input hidden type="file" multiple onChange={(e) => setFiles(e.target.files)} accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" />
            </Button>
            <FormHelperText sx={{ mt: 0.5 }}>الحد الأقصى 5 ملفات · صيغ مدعومة: png, jpg, pdf, docx</FormHelperText>
          </Grid>

          {/* honeypot */}
          <Grid size={{xs:12}} sx={{ display: 'none' }}>
            <Controller name="website" control={control} render={({ field }) => (
              <TextField {...field} label="موقعك" fullWidth />
            )} />
          </Grid>

          <Grid size={{xs:12}}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button type="submit" variant="contained" endIcon={<SendRoundedIcon />} disabled={submitting} sx={{ borderRadius: 2 }}>إرسال الرسالة</Button>
              {submitting && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress sx={{ width: 160, borderRadius: 2 }} />
                  <Typography variant="body2" color="text.secondary">جاري الإرسال…</Typography>
                </Stack>
              )}
              <Tooltip title="افتح دردشة كليم">
                <IconButton onClick={() => { /* @ts-ignore */ if (window?.KaleemChat?.open) window.KaleemChat.open(); }} size="large">
                  <SupportAgentIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}