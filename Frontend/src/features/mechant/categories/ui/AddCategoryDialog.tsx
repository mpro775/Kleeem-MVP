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
  createCategory,
  getCategoriesFlat,
  uploadCategoryImage,
} from "../api";
import { AxiosError } from "axios";

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  merchantId: string;
  defaultParentId?: string;
  parentOptions?: Category[];
}

export default function AddCategoryDialog({
  open,
  onClose,
  onAdd,
  merchantId,
  defaultParentId = "",
  parentOptions,
}: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string | "">("");
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX = 2 * 1024 * 1024;

  const [options, setOptions] = useState<Category[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  useEffect(() => {
    setParent(defaultParentId || "");
  }, [defaultParentId, open]);

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

  const canSubmit = useMemo(() => !!name && !saving, [name, saving]);

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createCategory({
        name,
        merchantId,
        parent: parent || undefined,
      });
      if (image) {
        await uploadCategoryImage(created._id, merchantId, image);
      }
      setName("");
      setParent("");
      setImage(null);
      onAdd();
    } catch (e: unknown) {
      setError(
        ((e as AxiosError)?.response?.data as { message?: string })?.message ||
        (e as Error)?.message ||
        "حدث خطأ أثناء الإضافة"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle dir="rtl">إضافة فئة جديدة</DialogTitle>
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
            label="فئة رئيسية (اختياري)"
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
              options.map((cat) => (
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
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    if (f && f.size > MAX) {
      setError("حجم الصورة يجب ألا يتجاوز 2MB.");
      return;
    }
    setError(null);
    setImage(f);
  }}
/>
            {image && <small>{image.name}</small>}
            <small>سيتم قصّ الصورة تلقائيًا إلى 1:1 وتقليل حجمها إذا لزم الأمر.</small>

          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button variant="contained" onClick={handleAdd} disabled={!canSubmit}>
              {saving ? "جارٍ الحفظ..." : "إضافة"}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
