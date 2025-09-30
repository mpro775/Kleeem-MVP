// src/components/categories/DeleteCategoryDialog.tsx
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Stack,  Alert, Checkbox, FormControlLabel,
} from "@mui/material";
import { useState } from "react";
import { deleteCategory } from "../api";
import { AxiosError } from "axios";

export default function DeleteCategoryDialog({
  open, onClose, onDeleted,
  categoryName, categoryId, merchantId, hasChildren,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  categoryName: string;
  categoryId: string;
  merchantId: string;
  hasChildren: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cascade, setCascade] = useState(hasChildren);

  const handleDelete = async () => {
    setDeleting(true); setError(null);
    try {
      await deleteCategory(categoryId, merchantId, cascade);
      onDeleted();
    } catch (e: unknown) {
      setError(
        ((e as AxiosError)?.response?.data as { message?: string })?.message ||
        (e as Error)?.message ||
        "تعذّر الحذف. قد تكون الفئة مرتبطة بمنتجات."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>حذف الفئة</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="warning">
            سيتم حذف الفئة <b>{categoryName}</b>
            {hasChildren ? " وجميع الفئات الفرعية التابعة لها." : "."}
            <br />
            لن يتم الحذف إذا كانت هناك منتجات مرتبطة بأي فئة داخل هذه الشجرة.
          </Alert>
          {hasChildren && (
            <FormControlLabel
              control={<Checkbox checked={cascade} onChange={(e) => setCascade(e.target.checked)} />}
              label="حذف الشجرة بالكامل (الأبناء والأحفاد)"
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>إلغاء</Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
          {deleting ? "جاري الحذف..." : "حذف"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
