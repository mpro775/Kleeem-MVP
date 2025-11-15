import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  TextField,
  Button,
  MenuItem,
  Input,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { Category } from "../type";
import {
  getCategoriesFlat,
  updateCategory,
  uploadCategoryImage,
} from "../api";
import { AxiosError } from "axios";

interface EditCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  merchantId: string;
  category: Category;
  parentOptions?: Category[];
}

export default function EditCategoryDialog({
  open,
  onClose,
  onSaved,
  merchantId,
  category,
  parentOptions,
}: EditCategoryDialogProps) {
  const [name, setName] = useState(category.name);
  const [parent, setParent] = useState<string | "">(category.parent ?? "");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<Category[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  useEffect(() => {
    setName(category.name);
    setParent((category.parent as string) || "");
    setNewImage(null);
  }, [category, open]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (parentOptions) {
        setOptions(parentOptions);
        return;
      }
      if (!merchantId) return;
      setLoadingParents(true);
      try {
        const list = await getCategoriesFlat(merchantId);
        if (!ignore) setOptions(list);
      } catch {
        if (!ignore) setError("فشل جلب الفئات الرئيسية.");
      } finally {
        if (!ignore) setLoadingParents(false);
      }
    }
    if (open) load();
    return () => {
      ignore = true;
    };
  }, [open, merchantId, parentOptions]);

  // لا تسمح باختيار نفسه كأب
  const parentChoices = useMemo(
    () => options.filter((o) => o._id !== category._id),
    [options, category._id]
  );

  const canSubmit = useMemo(() => !!name && !saving, [name, saving]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateCategory(category._id, merchantId, {
        name,
        parent: parent || null,
      });
      if (newImage) {
        await uploadCategoryImage(category._id, merchantId, newImage);
      }
      onSaved();
    } catch (e: unknown) {
      setError(
        ((e as AxiosError)?.response?.data as { message?: string })?.message ||
        (e as Error)?.message ||
        "حدث خطأ أثناء الحفظ"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle dir="rtl">تعديل الفئة</DialogTitle>
      <DialogContent dir="rtl">
        <Stack spacing={2} mt={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="اسم الفئة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <TextField
            select
            label="الفئة الرئيسية"
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            fullWidth
            disabled={loadingParents}
          >
            <MenuItem value="">لا شيء (فئة رئيسية)</MenuItem>
            {loadingParents ? (
              <MenuItem disabled>
                <CircularProgress size={18} sx={{ mr: 1 }} /> جاري التحميل...
              </MenuItem>
            ) : (
              parentChoices.map((cat) => (
                <MenuItem value={cat._id} key={cat._id}>
                  {cat.name}
                </MenuItem>
              ))
            )}
          </TextField>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Input
              type="file"
              inputProps={{ accept: "image/*" }}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setNewImage(target.files?.[0] ?? null);
              }}
            />
            {newImage && <small>{newImage.name}</small>}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={!canSubmit}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
