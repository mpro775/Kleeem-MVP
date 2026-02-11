import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Snackbar,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { LoadingButton } from "@mui/lab";
import type { SelectChangeEvent } from "@mui/material";

import {
  createProduct,
  uploadProductImages,
  getAttributeDefinitions,
} from "../api";
import { getCategoriesFlat } from "../../categories/api";
import type { Category } from "../../categories/type";
import type {
  Currency,
  CreateProductDto,
  Badge,
  AttributeDefinition,
  VariantInput,
} from "../type";

import TagsInput from "@/shared/ui/TagsInput";
import OfferEditor, { type OfferForm } from "./OfferEditor";
import AttributesEditor, { type AttributeSelection } from "./AttributesEditor";
import VariantsGenerator from "./VariantsGenerator";
import BadgesEditor from "./BadgesEditor";
import { toMessageString } from "@/shared/utils/text";
import { ensureIdString } from "@/shared/utils/ids";
import { useErrorHandler } from '@/shared/errors';

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  onProductAdded?: () => void;
}

type PreviewFile = { file: File; url: string };


export default function AddProductDialog({
  open,
  onClose,
  merchantId,
  onProductAdded,
}: AddProductDialogProps) {
  const { handleError } = useErrorHandler();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // ---------- الفئات (Leaf فقط) ----------
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    if (!open) return;
    getCategoriesFlat(merchantId)
      .then(setCategories)
      .catch(() => setCategories([]));
    getAttributeDefinitions()
      .then(setAttributeDefs)
      .catch(() => setAttributeDefs([]));
  }, [open, merchantId]);

  const leafCategories = useMemo(() => {
    const parentIds = new Set(
      categories.filter((c) => c.parent).map((c) => String(c.parent))
    );
    return categories.filter((c) => !parentIds.has(String(c._id)));
  }, [categories]);

  // ---------- الحالة العامة ----------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Snackbar ----------
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: "", severity: "info" });

 
const openSnack = (message: unknown, severity: 'success'|'info'|'warning'|'error'='info') => {
  setSnack({ open: true, message: toMessageString(message), severity });
};  

  // ---------- نموذج المنتج ----------
  const [form, setForm] = useState<CreateProductDto>({
    name: "",
    shortDescription: "",
    richDescription: "",
    category: "",
    price: 0,
    isAvailable: true,
    keywords: [],
    specsBlock: [],
    source: "manual",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "price") {
      const v = Number(value);
      setForm((f) => ({ ...f, price: Number.isFinite(v) ? v : 0 }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSelectCategory = (e: SelectChangeEvent<string>) => {
    setForm((f) => ({ ...f, category: e.target.value as string }));
  };

  const handleSwitch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, isAvailable: e.target.checked }));
  };

  // ---------- الكلمات المفتاحية & مواصفات نصية (chips) ----------
  const [keywordTags, setKeywordTags] = useState<string[]>([]);
  const [specTags, setSpecTags] = useState<string[]>([]);

  // ---------- العملة + العرض + السمات ----------
  const [currency, setCurrency] = useState<Currency>("YER");
  const [offer, setOffer] = useState<OfferForm>({ enabled: false });
  const [attributes, setAttributes] = useState<AttributeSelection[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDefinition[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [hasVariants, setHasVariants] = useState<boolean>(false);

  // ---------- الصور ----------
  const MAX_FILES = 6;
  const MAX_MB = 2;
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const revokeAll = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    const errs: string[] = [];

    const filtered = incoming.filter((f) => {
      const okType = ["image/png", "image/jpeg", "image/webp"].includes(f.type);
      const okSize = f.size <= MAX_MB * 1024 * 1024;
      if (!okType) errs.push(`صيغة غير مدعومة: ${f.name}`);
      if (!okSize) errs.push(`يتجاوز ${MAX_MB}MB: ${f.name}`);
      return okType && okSize;
    });

    const available = MAX_FILES - files.length;
    const toAdd = filtered.slice(0, Math.max(0, available));
    if (filtered.length > toAdd.length) {
      errs.push(`يمكنك إضافة حتى ${MAX_FILES} صور فقط لكل منتج.`);
    }

    // أنشئ روابط معاينة مرة واحدة + إدارة الذاكرة
    const newPrev: PreviewFile[] = toAdd.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setFileErrors(errs);
    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...newPrev]);

    if (e.target) e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ---------- محاكاة "تعرّف كليم" ----------
  const steps = [
    "تحليل البيانات الأساسية",
    "توليد الكلمات الدليلية",
    "بناء المتجهات الدلالية",
    "ربط الروابط الذكية",
    "تحديث فهرس البحث",
  ];
  const [activeStep, setActiveStep] = useState<number>(-1); // -1 = مخفي
  const stepTimer = useRef<number | null>(null);

  const startKaleemSimulation = () => {
    setActiveStep(0);
    stepTimer.current = window.setInterval(() => {
      setActiveStep((s) => (s >= steps.length - 1 ? s : s + 1));
    }, 700);
  };

  const stopKaleemSimulation = () => {
    if (stepTimer.current) {
      window.clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
    setActiveStep(steps.length - 1);
    setTimeout(() => setActiveStep(-1), 500);
  };

  useEffect(() => {
    return () => {
      if (stepTimer.current) window.clearInterval(stepTimer.current);
      revokeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- إرسال ----------
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    startKaleemSimulation();
    try {
      const { price, ...restForm } = form;
      const payload: CreateProductDto = {
        ...restForm,
        prices: { [currency || "YER"]: form.price ?? 0 },
        category: ensureIdString(form.category), 
        currency,
        offer: offer.enabled ? { ...offer } : { enabled: false },
        attributes,
        hasVariants,
        variants: hasVariants ? variants : undefined,
        badges,
        keywords: keywordTags,
        specsBlock: [...specTags],
        source: "manual",
      };
  
      // 1) إنشاء المنتج
      const created = await createProduct(payload);
      const productId =
      typeof (created as any)?._id === 'string'
        ? (created as any)._id
        : (created as any)?._id?.toString?.() ?? String((created as any)._id);
    
    // 2) رفع الصور (إن وجدت)
    if (files.length) {
      const res = await uploadProductImages(productId, files, false);
      if (res.remaining === 0 && files.length > res.accepted) {
        setFileErrors([`تم قبول ${res.accepted} صور فقط (الحد 6).`]);
      }
    }
  
      stopKaleemSimulation();
      setLoading(false);
      openSnack("تمت إضافة المنتج — كَلِيم صار يعرفه ويستدعيه في الردود 👌", "success");
      onProductAdded?.();
      onClose();
  
      // نظّف معاينات الصور
      revokeAll();
      setPreviews([]);
    
    } catch (error: any) {
      handleError(error);
      stopKaleemSimulation();
      setLoading(false);
  
      // استخرج رسالة نصية آمنة
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        "فشل في إضافة المنتج";
  
      // لو Array رجّعها كسطر واحد
      const pretty = Array.isArray(msg) ? msg.join(" · ") : String(msg);
  
      setError(pretty);
      openSnack(pretty, "error");
    }
  };
  
  

  // ---------- إعادة ضبط عند الفتح ----------
  useEffect(() => {
    if (open) {
      revokeAll();
      setForm({
        name: "",
        shortDescription: "",
        richDescription: "",
        category: "",
        price: 0,
        isAvailable: true,
        keywords: [],
        specsBlock: [],
        source: "manual",
      });
      setKeywordTags([]);
      setSpecTags([]);
      setCurrency("SAR");
      setOffer({ enabled: false });
      setAttributes([]);
      setBadges([]);
      setFiles([]);
      setPreviews([]);
      setFileErrors([]);
      setError(null);
      setActiveStep(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit =
    !!form.name?.trim() && !!form.category && Number.isFinite(form.price ?? 0) && (form.price ?? 0) >= 0;
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        dir="rtl"
      >
        <DialogTitle>إضافة منتج جديد</DialogTitle>

        {/* بانر محاكاة "تعرّف كليم" */}
        {activeStep >= 0 && (
          <Card elevation={0} sx={{ mx: 3, mb: 1, mt: 1, bgcolor: "primary.50" }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                <SmartToyIcon color="primary" />
                <Typography fontWeight={600}>كَلِيم الآن يتعرّف على منتجك 🤖</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={1}>
                نجهّز المنتج للبحث الذكيّ والردود: خطوات سريعة تحت الكواليس.
              </Typography>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <LinearProgress sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        )}

        <DialogContent>
          {loading && activeStep < 0 && <LinearProgress sx={{ mb: 2 }} />}

          <Stack spacing={2} mt={1}>
            <TextField
              label="اسم المنتج"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
            />
          <TextField
            label="وصف قصير"
            name="shortDescription"
            value={form.shortDescription}
            onChange={handleChange}
            fullWidth
            multiline
            inputProps={{ maxLength: 200 }}
            helperText={`${form.shortDescription?.length ?? 0}/200`}
          />

          <TextField
            label="وصف تفصيلي (يمكن لصق HTML بسيط)"
            name="richDescription"
            value={form.richDescription}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={3}
          />

            {/* الفئة (Leaf فقط) */}
            <TextField
              select
              label="الفئة"
              name="category"
              value={form.category}
              fullWidth
              onChange={(e) => handleSelectCategory(e as unknown as SelectChangeEvent<string>)}
              required
              helperText="يمكن اختيار الفئات النهائية فقط"
            >
              {leafCategories.map((cat) => (
                <MenuItem key={String(cat._id)} value={String(cat._id)}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="السعر"
              name="price"
              type="number"
              value={form.price}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ min: 0, step: "0.5", inputMode: "decimal" }}
            />

            {/* اختيار العملة */}
            <TextField
              select
              label="العملة"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              fullWidth
            >
              <MenuItem value="SAR">ريال سعودي</MenuItem>
              <MenuItem value="YER">ريال يمني</MenuItem>
              <MenuItem value="USD">دولار أمريكي</MenuItem>
            </TextField>

            <FormControlLabel
              control={<Switch checked={form.isAvailable} onChange={handleSwitch} />}
              label="متاح للبيع"
            />

            {/* محرر العرض */}
            <OfferEditor value={offer} onChange={setOffer} />

            {/* الكلمات المفتاحية */}
            <TagsInput
              label="الكلمات المفتاحية"
              value={keywordTags}
              onChange={setKeywordTags}
              placeholder="اكتب ثم Enter لإضافة كلمة"
              suggestions={["إلكترونيات", "ملابس", "رجالي", "نسائي", "فاخر", "سريع"]}
            />

            {/* مواصفات نصية سريعة */}
            <TagsInput
              label="مواصفات سريعة (نص)"
              value={specTags}
              onChange={setSpecTags}
              placeholder="مثال: بطارية قوية ثم Enter"
              suggestions={["بطارية قوية", "مقاوم للماء", "ضمان سنتين", "خفيف الوزن"]}
            />

            {/* السمات متعددة القيم */}
            <AttributesEditor
              value={attributes}
              onChange={setAttributes}
              definitions={attributeDefs}
            />

            {/* المتغيرات */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hasVariants}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasVariants(checked);
                      if (!checked) setVariants([]);
                    }}
                  />
                }
                label="يحتوي على متغيرات"
              />
              {hasVariants && (
                <Typography variant="body2" color="text.secondary">
                  اختر أبعاد المتغيرات في السمات (isVariantDimension) ثم اضغط توليد.
                </Typography>
              )}
            </Stack>

            {hasVariants && (
              <VariantsGenerator
                attributes={attributes}
                definitions={attributeDefs}
                value={variants}
                onChange={setVariants}
              />
            )}

          {/* الملصقات */}
          <BadgesEditor value={badges} onChange={setBadges} />

            {/* رفع صور (حد 6 × 2MB) */}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                component="label"
                disabled={files.length >= MAX_FILES}
                sx={{ mr: "auto" }}
              >
                رفع صور (حتى {MAX_FILES} صور × {MAX_MB}MB)
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImages}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                {files.length}/{MAX_FILES}
              </Typography>
            </Stack>

            {/* معاينة الصور المختارة + إزالة */}
            {previews.length > 0 && (
              <Grid container spacing={1}>
                {previews.map((p, i) => (
                  <Grid size={{ xs: 4, sm: 3, md: 2 }} key={i}>
                    <Stack spacing={1} alignItems="center">
                      <img
                        src={p.url}
                        alt={p.file.name}
                        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 8 }}
                      />
                      <Chip label="إزالة" size="small" onClick={() => removeFile(i)} />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* أخطاء الملفات */}
            {fileErrors.length > 0 && (
              <Stack spacing={0.5}>
                {fileErrors.map((err, i) => (
                  <Typography key={i} color="error" variant="caption">
                    {err}
                  </Typography>
                ))}
              </Stack>
            )}

            {error && (
              <Alert severity="error" variant="filled">
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>إلغاء</Button>
          <LoadingButton
            onClick={handleSubmit}
            variant="contained"
            loading={loading}
            loadingPosition="start"
            startIcon={<CheckCircleIcon />}
            disabled={!canSubmit}
          >
            {loading ? "جارٍ الإضافة..." : "إضافة"}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar عام */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ open: false, message: "", severity: "info" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack({ open: false, message: "", severity: "info" })}
          severity={snack.severity}
          variant="filled"
          icon={<SmartToyIcon fontSize="inherit" />}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
