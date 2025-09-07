// src/features/support/components/SupportForm.tsx
import {
  Paper,
  Stack,
  Typography,
  Grid,
  Box,
  TextField,
  MenuItem,
  Button,
  LinearProgress,
  Collapse,
  Alert,
  IconButton,
  Chip,
} from "@mui/material";
import { type UseFormReturn, Controller } from "react-hook-form";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { type AdminContactPayload, type ContactResponse, ContactTopic } from "../types";

// دالة مساعدة للتحقق من الملفات (يمكن وضعها في ملف utils)
const MAX_FILES = 5;
const MAX_MB = 5;
function withinLimits(list: FileList) {
  if (list.length > MAX_FILES)
    return { ok: false, reason: `الحد الأقصى ${MAX_FILES} ملفات` };
  const tooBig = Array.from(list).find((f) => f.size > MAX_MB * 1024 * 1024);
  if (tooBig)
    return { ok: false, reason: `يجب أن يكون حجم الملف أقل من ${MAX_MB}MB` };
  return { ok: true };
}

interface SupportFormProps {
  form: UseFormReturn<AdminContactPayload>;
  onSubmit: (values: AdminContactPayload) => void;
  submitting: boolean;
  error: string | null;
  submissionResponse: ContactResponse | null;
  files: FileList | null;
  onFilesChange: (files: FileList | null) => void;
}

export const SupportForm = ({
  form,
  onSubmit,
  submitting,
  error,
  submissionResponse,
  files,
  onFilesChange,
}: SupportFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const topics = [
    { value: ContactTopic.SALES, label: "مبيعات" },
    { value: ContactTopic.SUPPORT, label: "دعم فني" },
    { value: ContactTopic.BILLING, label: "فواتير" },
    { value: ContactTopic.PARTNERSHIP, label: "شركات/شراكات" },
  ];
  const urgencies = [
    { value: "low", label: "منخفض" },
    { value: "normal", label: "عادي" },
    { value: "high", label: "عالي" },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      onFilesChange(null);
      return;
    }
    const check = withinLimits(fileList);
    if (!check.ok) {
      alert(`خطأ في المرفقات: ${check.reason}`);
      e.target.value = ""; // Reset input
      return;
    }
    onFilesChange(fileList);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <SupportAgentIcon />
        <Typography variant="h6" fontWeight={800}>
          أنشئ تذكرة دعم
        </Typography>
      </Stack>

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Collapse>
      <Collapse in={!!submissionResponse}>
        <Alert
          icon={<CheckCircleRoundedIcon fontSize="inherit" />}
          severity="success"
          sx={{ mb: 2 }}
        >
          تم فتح التذكرة بنجاح! رقمها:{" "}
          <strong>{submissionResponse?.ticketNumber}</strong>
          <IconButton
            size="small"
            title="نسخ الرقم"
            onClick={() =>
              navigator.clipboard.writeText(
                String(submissionResponse?.ticketNumber)
              )
            }
          >
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Alert>
      </Collapse>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2}>
          <Grid size={{xs: 12, md: 6}}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="الاسم"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{xs: 12, md: 6}}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="البريد الإلكتروني"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{xs: 12, md: 6}}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="الجوال (اختياري)" fullWidth />
              )}
            />
          </Grid>
          <Grid size={{xs: 12, md: 6}}>
            <Controller
              name="merchantId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="معرّف التاجر"
                  fullWidth
                  disabled
                  error={!!errors.merchantId}
                  helperText={errors.merchantId?.message || "يُملأ تلقائيًا"}
                />
              )}
            />
          </Grid>
          <Grid size={{xs: 12, md: 6}}>
            <Controller
              name="topic"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="نوع الطلب"
                  fullWidth
                  error={!!errors.topic}
                  helperText={errors.topic?.message}
                >
                  {topics.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{xs: 12, md: 6}}>
            <Controller
              name="urgency"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="الأولوية" fullWidth>
                  {urgencies.map((u) => (
                    <MenuItem key={u.value} value={u.value}>
                      {u.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{xs: 12}}>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="عنوان التذكرة"
                  fullWidth
                  error={!!errors.subject}
                  helperText={errors.subject?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{xs: 12}}>
            <Controller
              name="message"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="وصف المشكلة/الطلب"
                  fullWidth
                  multiline
                  minRows={6}
                  error={!!errors.message}
                  helperText={errors.message?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{xs: 12}} sx={{ display: "none" }}>
            <Controller
              name="website"
              control={control}
              render={({ field }) => <TextField {...field} />}
            />
          </Grid>

          <Grid size={{xs: 12}}>
            <Button component="label" variant="outlined">
              إرفاق ملفات{" "}
              <input hidden type="file" multiple onChange={handleFileSelect} />
            </Button>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {files &&
                Array.from(files).map((f, i) => (
                  <Chip
                    key={i}
                    size="small"
                    label={f.name}
                    onDelete={() => {
                      const dt = new DataTransfer();
                      Array.from(files)
                        .filter((_, idx) => i !== idx)
                        .forEach((file) => dt.items.add(file));
                      onFilesChange(dt.files.length > 0 ? dt.files : null);
                    }}
                  />
                ))}
            </Stack>
          </Grid>

            <Grid size={{xs: 12}}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                type="submit"
                variant="contained"
                endIcon={<SendRoundedIcon />}
                disabled={submitting}
              >
                إرسال
              </Button>
              {submitting && (
                <LinearProgress sx={{ width: 160, borderRadius: 2 }} />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
