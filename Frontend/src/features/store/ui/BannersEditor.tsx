// src/components/store/BannersEditor.tsx
import {
  Box,
  Button,
  TextField,
  Stack,
  IconButton,
  Switch,
  Typography,
  LinearProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Banner } from "../type";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadBannerImages } from "@/features/mechant/storefront-theme/api";

type BannerValue = string | number | boolean | undefined;

interface Props {
  merchantId: string; // 👈 جديد
  banners: Banner[];
  onChange: (banners: Banner[]) => void;
  loading?: boolean;
}

const MAX_BANNERS = 5;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_PIXELS = 5_000_000; // 5MP

export default function BannersEditor({
  merchantId,
  banners,
  onChange,
  loading,
}: Props) {
  const [localBanners, setLocalBanners] = useState<Banner[]>(
    Array.isArray(banners) ? banners : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    console.log("BannersEditor received banners:", banners);
    console.log("Banners type:", typeof banners);
    console.log("Banners is array:", Array.isArray(banners));
    // تأكد من أن البانرات مصفوفة صحيحة
    const validBanners = Array.isArray(banners) ? banners : [];
    console.log("Valid banners:", validBanners);
    console.log("Setting local banners to:", validBanners);
    setLocalBanners(validBanners);
  }, [banners]);

 

  const remainingSlots = useMemo(() => {
    const slots = Math.max(0, MAX_BANNERS - localBanners.length);
    console.log(
      "Remaining slots:",
      slots,
      "current banners:",
      localBanners.length
    );
    return slots;
  }, [localBanners.length]);

  const handleAdd = () => {
    if (localBanners.length >= MAX_BANNERS) return;
    const newBanner = { text: "", active: true, order: localBanners.length };
    console.log("Adding new banner:", newBanner);
    setLocalBanners([...localBanners, newBanner]);
  };

  const handleRemove = (idx: number) => {
    console.log("Removing banner at index:", idx);
    const newBanners = [...localBanners];
    newBanners.splice(idx, 1);
    // أعد ترقيم order
    const normalized = newBanners.map((b, i) => ({ ...b, order: i }));
    console.log("Banners after removal:", normalized);
    setLocalBanners(normalized);
  };

  const handleChange = (idx: number, key: keyof Banner, value: BannerValue) => {
    console.log("Changing banner at index:", idx, "key:", key, "value:", value);
    const newBanners = [...localBanners];
    newBanners[idx] = { ...newBanners[idx], [key]: value };
    console.log("Updated banner:", newBanners[idx]);
    setLocalBanners(newBanners);
  };

  const normalizeBeforeSave = (list: Banner[]) => {
    console.log("Normalizing banners:", list);
    const normalized = list
      .slice(0, MAX_BANNERS)
      .map((b, i) => ({ ...b, order: i, active: b.active ?? true }));
    console.log("Normalized result:", normalized);
    return normalized;
  };

  const handleSave = () => {
    console.log("Saving local banners:", localBanners);
    const normalized = normalizeBeforeSave(localBanners);
    console.log("Normalized banners:", normalized);
    onChange(normalized);
  };

  const openFileDialog = () => fileInputRef.current?.click();

  // helper: قياس أبعاد الصورة لفلترة > 5MP قبل الإرسال
  const getImagePixels = (file: File) =>
    new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const pixels = (img.naturalWidth || 0) * (img.naturalHeight || 0);
        URL.revokeObjectURL(url);
        resolve(pixels);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || remainingSlots <= 0) return;

    setError(null);

    // قص بعدد الخانات المتاحة
    const wanted = Array.from(files).slice(0, remainingSlots);

    // فلترة الصيغ
    const allowed = wanted.filter((f) => ALLOWED_MIME.includes(f.type));
    if (allowed.length < wanted.length) {
      setError("بعض الملفات رُفضت: يُسمح فقط PNG/JPG/WEBP.");
    }

    // فلترة 5MP (كلينت سايد فقط للـ UX، السيرفر يتحقق أيضًا)
    const finalFiles: File[] = [];
    for (const f of allowed) {
      try {
        const pixels = await getImagePixels(f);
        if (pixels <= MAX_PIXELS) {
          finalFiles.push(f);
        } else {
          setError(
            (prev) =>
              (prev ? prev + " " : "") +
              `تم تخطي صورة لأنها تتجاوز 5 ميجا بكسل.`
          );
        }
      } catch {
        // لو تعذّر القياس، دع السيرفر يتحقق
        finalFiles.push(f);
      }
    }

    if (finalFiles.length === 0) return;

    try {
      setBusy(true);
      const res = await uploadBannerImages(merchantId, finalFiles);
      // أضف البنرات الجديدة مع الصور القادمة من السيرفر
      setLocalBanners((prev) => {
        console.log("Adding uploaded images:", res.urls);
        const appended = [
          ...prev,
          ...res.urls.map((u, i) => ({
            image: u,
            text: "",
            active: true,
            order: prev.length + i,
          })),
        ];
        const result = appended.slice(0, MAX_BANNERS);
        console.log("Banners after upload:", result);
        return result;
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "فشل رفع الصور.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Box>
      {(busy || loading) && <LinearProgress sx={{ mb: 2 }} />}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          البنرات: {localBanners.length}/{MAX_BANNERS}
        </Typography>

        <Stack direction="row" spacing={1}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            style={{ display: "none" }}
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button
            variant="outlined"
            onClick={openFileDialog}
            disabled={remainingSlots <= 0 || busy}
          >
            رفع صور
          </Button>
          <Button
            variant="outlined"
            onClick={handleAdd}
            disabled={localBanners.length >= MAX_BANNERS || busy}
          >
            + إضافة بانر يدوي
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading || busy}
          >
            حفظ التغييرات
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mb: 1, display: "block" }}
        >
          {error}
        </Typography>
      )}

      {localBanners.length === 0 ? (
        <Box textAlign="center" py={4} color="text.secondary">
          <Typography variant="body1" mb={2}>
            لا توجد بانرات حالياً
          </Typography>
          <Typography variant="body2">
            اضغط على "رفع صور" أو "إضافة بانر يدوي" لبدء إضافة البانرات
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {localBanners.map((b, idx) => (
            <Box key={idx} border={1} p={2} borderRadius={2} mb={1}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="عنوان البانر"
                    value={b.text}
                    onChange={(e) => handleChange(idx, "text", e.target.value)}
                    fullWidth
                  />
                  <Switch
                    checked={b.active ?? true}
                    onChange={(e) =>
                      handleChange(idx, "active", e.target.checked)
                    }
                    color="success"
                  />
                  <IconButton onClick={() => handleRemove(idx)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Stack>

                <TextField
                  label="رابط عند الضغط (اختياري)"
                  value={b.url ?? ""}
                  onChange={(e) => handleChange(idx, "url", e.target.value)}
                  fullWidth
                />

                <TextField
                  label="رابط صورة البانر (اختياري)"
                  value={b.image ?? ""}
                  onChange={(e) => handleChange(idx, "image", e.target.value)}
                  fullWidth
                />

                <TextField
                  label="لون خلفية البانر (hex أو اسم اللون)"
                  value={b.color ?? ""}
                  onChange={(e) => handleChange(idx, "color", e.target.value)}
                  fullWidth
                />

                {/* معاينة الصورة إن وُجدت */}
                {b.image && (
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={b.image}
                      alt={`banner-${idx}`}
                      style={{
                        maxWidth: "100%",
                        borderRadius: 8,
                        display: "block",
                      }}
                    />
                  </Box>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
