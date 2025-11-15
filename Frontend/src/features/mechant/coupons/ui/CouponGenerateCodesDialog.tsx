// src/features/mechant/coupons/ui/CouponGenerateCodesDialog.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";

interface CouponGenerateCodesDialogProps {
  open: boolean;
  loading?: boolean;
  codes?: string[] | null;
  onClose: () => void;
  onGenerate: (options: { count: number; length: number }) => Promise<void>;
}

const MIN_COUNT = 1;
const MAX_COUNT = 50;
const MIN_LENGTH = 6;
const MAX_LENGTH = 12;

export default function CouponGenerateCodesDialog({
  open,
  loading = false,
  codes,
  onClose,
  onGenerate,
}: CouponGenerateCodesDialogProps) {
  const [count, setCount] = useState(5);
  const [length, setLength] = useState(8);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopySuccess(false);
      setCount(5);
      setLength(8);
    }
  }, [open]);

  const handleGenerate = async () => {
    if (loading) return;
    const safeCount = clamp(count, MIN_COUNT, MAX_COUNT);
    const safeLength = clamp(length, MIN_LENGTH, MAX_LENGTH);
    setCount(safeCount);
    setLength(safeLength);
    await onGenerate({ count: safeCount, length: safeLength });
  };

  const handleCopy = async () => {
    if (!codes || codes.length === 0) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>توليد أكواد كوبونات</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            استخدم هذه الأداة لإنشاء مجموعة أكواد عشوائية يمكنك توزيعها على عملائك. سيتم حفظها في النظام بمجرد إضافتها يدويًا أو تحميلها عبر ملف.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="number"
              label="عدد الأكواد"
              fullWidth
              inputProps={{ min: MIN_COUNT, max: MAX_COUNT }}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              helperText={`بين ${MIN_COUNT} و ${MAX_COUNT} كحد أقصى`}
            />
            <TextField
              type="number"
              label="طول الكود"
              fullWidth
              inputProps={{ min: MIN_LENGTH, max: MAX_LENGTH }}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
              helperText={`بين ${MIN_LENGTH} و ${MAX_LENGTH} حرفاً`}
            />
          </Stack>

          {codes && codes.length > 0 ? (
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  الأكواد المولّدة ({codes.length})
                </Typography>
                <Button
                  startIcon={<ContentCopyOutlinedIcon />}
                  onClick={handleCopy}
                  color={copySuccess ? "success" : "primary"}
                >
                  {copySuccess ? "تم النسخ" : "نسخ جميع الأكواد"}
                </Button>
              </Stack>
              <Box
                component="pre"
                sx={{
                  bgcolor: "grey.100",
                  borderRadius: 2,
                  p: 2,
                  maxHeight: 220,
                  overflowY: "auto",
                  fontFamily: "monospace",
                  direction: "ltr",
                  fontSize: 14,
                }}
              >
                {codes.join("\n")}
              </Box>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          إغلاق
        </Button>
        <Button variant="contained" color="primary" onClick={handleGenerate} disabled={loading}>
          توليد الأكواد
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

