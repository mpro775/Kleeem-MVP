// src/features/mechant/promotions/ui/PromotionDeleteDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import type { Promotion } from "../type";

interface PromotionDeleteDialogProps {
  open: boolean;
  promotion?: Promotion | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function PromotionDeleteDialog({
  open,
  promotion,
  loading = false,
  onCancel,
  onConfirm,
}: PromotionDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>حذف العرض</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography>
            هل أنت متأكد من رغبتك في حذف العرض{" "}
            <Typography component="span" fontWeight={600}>
              {promotion?.name}
            </Typography>
            ؟ هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            سيختفي العرض من قائمة العروض ولن يتم تطبيقه على العملاء.
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

