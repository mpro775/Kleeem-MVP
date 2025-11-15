// src/features/mechant/coupons/ui/CouponDeleteDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import type { Coupon } from "../type";

interface CouponDeleteDialogProps {
  open: boolean;
  coupon?: Coupon | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CouponDeleteDialog({
  open,
  coupon,
  loading = false,
  onCancel,
  onConfirm,
}: CouponDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>حذف الكوبون</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography>
            هل أنت متأكد من رغبتك في حذف الكوبون{" "}
            <Typography component="span" sx={{ fontFamily: "monospace" }}>
              {coupon?.code}
            </Typography>
            ؟ هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            سيتم إيقاف استخدام الكود فوراً ولن يظهر في قائمة الكوبونات بعد الآن.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={loading}
        >
          تأكيد الحذف
        </Button>
      </DialogActions>
    </Dialog>
  );
}

