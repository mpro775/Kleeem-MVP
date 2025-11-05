'use client';

import { useEffect, useRef, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  CircularProgress,
  Stack,
  Snackbar,
  Alert,
  Tooltip,
  InputAdornment,
  IconButton,
} from "@mui/material";

import axios from "@/lib/axios";
import type { MerchantInfo } from "@/features/merchant/merchant-settings/types";
import { checkPublicSlugAvailability } from "../api";
import { ContentCopyRounded } from "@mui/icons-material";

interface GeneralInfoFormProps {
  initialData: MerchantInfo;
  onSave: (data: Partial<MerchantInfo>) => Promise<void>;
  loading?: boolean;
}
function isValidSlug(s: string) {
  return /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(s);
}

function normalizeSlug(v: string) {
  const cleaned = v
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return /^[a-z]/.test(cleaned) ? cleaned : cleaned ? `s${cleaned}` : "";
}

export default function GeneralInfoForm({
  initialData,
  onSave,
  loading,
}: GeneralInfoFormProps) {
  const [form, setForm] = useState<MerchantInfo>({ ...initialData });
  const [logoUploading, setLogoUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState<string>(
    initialData.publicSlug ?? ""
  );
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");
  const debounceRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (key: keyof MerchantInfo, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ✅ رفع الشعار
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget; // snapshot قبل await
    const file = inputEl.files?.[0];
    if (!file) return;

    const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
    const MAX_SIZE_MB = 2;
    if (!ACCEPT.includes(file.type)) {
      setError("الملف يجب أن يكون PNG أو JPG أو WEBP");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`الحجم الأقصى ${MAX_SIZE_MB}MB`);
      return;
    }

    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);

      const res = await axios.post(`/merchants/${initialData._id}/logo`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // الباك إند يرسل الآن: { success, data: { url }, requestId, timestamp }
      const url = (res.data as any)?.url;

      if (!url) throw new Error("لم يتم استلام رابط الشعار");
      handleChange("logoUrl", url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل رفع الشعار");
    } finally {
      setLogoUploading(false);
      inputEl.value = ""; // آمن لأنه snapshot قبل await
    }
  };

  // ✅ فحص الـ slug
  useEffect(() => {
    const orig = initialData.publicSlug || "";
    const normalized = normalizeSlug(slugInput || "");

    if (normalized === orig) {
      setSlugStatus("idle");
      return;
    }

    if (!normalized || !isValidSlug(normalized)) {
      setSlugStatus(slugInput ? "invalid" : "idle");
      return;
    }

    setSlugStatus("checking");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { available } = await checkPublicSlugAvailability(normalized);
        setSlugStatus(available ? "ok" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [slugInput, initialData.publicSlug]);

  const origin =
    import.meta.env.VITE_PUBLIC_WEB_ORIGIN ||
    window.location.origin.replace(/\/+$/, "");
  const chatPreview = slugInput ? `${origin}/${slugInput}/chat` : "—";
  const storePreview = slugInput ? `${origin}/${slugInput}/store` : "—";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(true);
    } catch {}
  };

  const handleSave = async () => {
    try {
      const payload: Partial<MerchantInfo> = {};
      if (form.name !== initialData.name) payload.name = form.name;
      if ((form.phone || "") !== (initialData.phone || ""))
        payload.phone = form.phone;
      if (
        (form.businessDescription || "") !==
        (initialData.businessDescription || "")
      )
        payload.businessDescription = form.businessDescription;
      if ((form.logoUrl || "") !== (initialData.logoUrl || ""))
        payload.logoUrl = form.logoUrl;

      const normalized = normalizeSlug(slugInput || "");
      if (normalized) {
        payload.publicSlug = normalized;
      }
      if (normalized && normalized !== initialData.publicSlug) {
        if (!isValidSlug(normalized)) {
          setError(
            "سلاج غير صالح. يجب أن يبدأ بحرف إنجليزي، وطوله 3–50، وبدون شرطة في النهاية."
          );
          return;
        }
        payload.publicSlug = normalized;
      } else if (slugStatus === "taken") {
        setError("هذا السلاج محجوز");
        return;
      }

      if (Object.keys(payload).length > 0) {
        await onSave(payload);
        if (payload.publicSlug) {
          setSlugInput(payload.publicSlug);
          setForm((f) => ({ ...f, publicSlug: payload.publicSlug }));
          setSlugStatus("ok");
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <Box component="form" noValidate dir="rtl">
      <Typography variant="h6" mb={2}>
        المعلومات العامة للمتجر
      </Typography>

      {/* الشعار */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        mb={3}
        flexWrap="wrap"
      >
        <Avatar
          src={form.logoUrl}
          sx={{ width: 64, height: 64, bgcolor: "#eceff1" }}
        >
          {form.logoUrl ? null : "Logo"}
        </Avatar>
        <Button variant="outlined" component="label" disabled={logoUploading}>
          {logoUploading ? <CircularProgress size={20} /> : "تغيير الشعار"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleLogoUpload}
          />
        </Button>
        <Typography variant="body2" color="text.secondary">
          يُفضّل PNG/WebP بخلفية شفافة، حتى 2MB.
        </Typography>
      </Stack>

      {/* باقي الحقول */}
      <TextField
        label="اسم المتجر"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
        fullWidth
        required
        margin="normal"
      />
      <TextField
        label="رقم الهاتف"
        value={form.phone ?? ""}
        onChange={(e) => handleChange("phone", e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="السلاج الموحّد (رابط عام)"
        value={slugInput}
        onChange={(e) => setSlugInput(normalizeSlug(e.target.value))}
        fullWidth
        margin="normal"
        placeholder="مثال: acme-store"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {origin.replace(/^https?:\/\//, "")}/
            </InputAdornment>
          ),
          endAdornment: slugInput ? (
            <InputAdornment position="end">
              <Tooltip title="نسخ رابط الدردشة">
                <IconButton size="small" onClick={() => copy(chatPreview)}>
                  <ContentCopyRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="نسخ رابط المتجر">
                <IconButton size="small" onClick={() => copy(storePreview)}>
                  <ContentCopyRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : undefined,
        }}
        helperText={
          slugStatus === "checking"
            ? "جاري التحقق من التوفر..."
            : slugStatus === "ok"
            ? `متاح ✓ — روابطك: ${chatPreview} ، ${storePreview}`
            : slugStatus === "taken"
            ? "السلاج محجوز. جرّب اسمًا آخر."
            : slugStatus === "invalid"
            ? "السلاج غير صالح: يجب أن يبدأ بحرف إنجليزي، ويحتوي على حروف/أرقام/شرطة فقط، وطوله 3–50، وبدون شرطة في النهاية."
            : "اكتب سلاج مثل: acme-store (3–50 حرفًا)."
        }
        error={slugStatus === "taken" || slugStatus === "invalid"}
      />
      <TextField
        label="وصف المتجر"
        value={form.businessDescription ?? ""}
        onChange={(e) => handleChange("businessDescription", e.target.value)}
        fullWidth
        margin="normal"
        multiline
        rows={3}
      />

      <Button
        variant="contained"
        color="primary"
        onClick={handleSave}
        sx={{ mt: 3 }}
      >
        {loading ? <CircularProgress size={22} /> : "حفظ التعديلات"}
      </Button>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success">تم حفظ البيانات بنجاح!</Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(null)}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
}
