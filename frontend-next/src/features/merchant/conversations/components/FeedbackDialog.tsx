'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => Promise<void> | void;
  loading?: boolean;
}

const MAX = 300;
const MIN = 5;

const QUICK_REASONS = [
  'الإجابة غير صحيحة',
  'الرد عام وغير مفيد',
  'لم يفهم سؤالي',
  'طلب معلومات ناقصة',
  'لغة غير مناسبة/غير واضحة',
];

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const length = value.trim().length;
  const nearLimit = length > MAX - 25;
  const isTooShort = touched && length > 0 && length < MIN;
  const disabled = loading || length < MIN;

  const counterColor = useMemo(() => {
    if (length === 0) return 'text.secondary';
    if (nearLimit) return 'warning.main';
    if (length >= MIN) return 'success.main';
    return 'text.secondary';
  }, [length, nearLimit]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setValue('');
      setTouched(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open || loading) return;
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const ok = (isMac && e.metaKey) || (!isMac && e.ctrlKey);
      if (ok && e.key === 'Enter' && !disabled) {
        e.preventDefault();
        handleSend();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, disabled, value]);

  const handleAppend = (txt: string) => {
    setValue((v) => {
      const sep = v.trim().length ? ' — ' : '';
      return (v + sep + txt).slice(0, MAX);
    });
    setTouched(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    const text = value.trim();
    if (!text || loading || text.length < MIN) return;
    await onSubmit(text);
    setValue('');
    setTouched(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: 2.5,
          backdropFilter: 'blur(12px)',
          background: `linear-gradient(180deg,
            ${alpha(
              theme.palette.background.paper,
              theme.palette.mode === 'dark' ? 0.35 : 0.8
            )} 0%,
            ${alpha(
              theme.palette.background.paper,
              theme.palette.mode === 'dark' ? 0.25 : 0.6
            )} 100%
          )`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
          boxShadow: `0 24px 48px ${alpha(theme.palette.primary.main, 0.18)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          pr: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontWeight: 800,
        }}
      >
        يرجى توضيح سبب التقييم السلبي
        <Tooltip title="يساعدنا وصفك القصير على تحسين جودة الردود.">
          <InfoOutlinedIcon fontSize="small" sx={{ opacity: 0.8 }} />
        </Tooltip>
        <IconButton
          aria-label="إغلاق"
          onClick={onClose}
          edge="end"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={(length / MAX) * 100}
          sx={{
            height: 6,
            borderRadius: 6,
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: `linear-gradient(90deg, ${alpha(
                theme.palette.primary.main,
                0.9
              )}, ${alpha(
                theme.palette.secondary?.main || theme.palette.primary.light,
                0.9
              )})`,
            },
          }}
        />
      </Box>

      <DialogContent sx={{ pt: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {QUICK_REASONS.map((r) => (
            <Chip
              key={r}
              label={r}
              size="small"
              onClick={() => handleAppend(r)}
              sx={{
                fontWeight: 700,
                borderColor: alpha(theme.palette.primary.main, 0.3),
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              }}
              variant="outlined"
            />
          ))}
        </Box>

        <TextField
          autoFocus
          inputRef={inputRef}
          margin="dense"
          label="سبب التقييم"
          type="text"
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX))}
          onBlur={() => setTouched(true)}
          multiline
          minRows={4}
          disabled={loading}
          placeholder="مثال: الرد غير دقيق ولم يجب عن سؤالي بشكل كافٍ…"
          helperText={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                color={counterColor as any}
                sx={{ fontWeight: 700 }}
              >
                {length} / {MAX}
              </Typography>

              {isTooShort ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <WarningAmberRoundedIcon
                    sx={{ fontSize: 16, color: 'warning.main' }}
                  />
                  <Typography variant="caption" color="warning.main">
                    اكتب {MIN} أحرف على الأقل.
                  </Typography>
                </Box>
              ) : nearLimit ? (
                <Typography variant="caption" color="warning.main">
                  اقتربت من الحد الأقصى للنص.
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  اختصار: Ctrl/Cmd + Enter للإرسال
                </Typography>
              )}
            </Box>
          }
          FormHelperTextProps={{ sx: { mx: 0 } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(180deg, ${alpha('#111', 0.8)}, ${alpha(
                      '#0d0d0d',
                      0.8
                    )})`
                  : `linear-gradient(180deg, ${alpha('#fff', 0.9)}, ${alpha(
                      '#f9f9f9',
                      0.9
                    )})`,
              '& fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.25),
              },
              '&:hover fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.45),
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 3px ${alpha(
                  theme.palette.primary.main,
                  0.12
                )}`,
              },
            },
          }}
        />

        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            رجاءً اكتب تفاصيل قصيرة (على الأقل {MIN} أحرف). كلما كان وصفك أوضح،
            تحسّن النظام أسرع.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          onClick={handleSend}
          disabled={disabled}
          variant="contained"
          sx={{
            fontWeight: 800,
            boxShadow: 'none',
            background: `linear-gradient(90deg, ${alpha(
              theme.palette.primary.main,
              0.95
            )}, ${alpha(
              theme.palette.secondary?.main || theme.palette.primary.light,
              0.95
            )})`,
          }}
        >
          {loading ? 'جارٍ الإرسال...' : 'إرسال'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;

