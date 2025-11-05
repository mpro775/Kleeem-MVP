'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Box,
  Chip,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { LoadingButton } from '@mui/lab';
import type { SelectChangeEvent } from '@mui/material';
import { useSnackbar } from 'notistack';

import { createProduct, uploadProductImages } from '../api';
import { getCategoriesFlat } from '../../categories/api';
import type { Category } from '../../categories/types';
import type { Currency, CreateProductDto } from '../types';

import TagsInput from '@/components/shared/TagsInput';
import OfferEditor, { type OfferForm } from './OfferEditor';
import AttributesEditor from './AttributesEditor';
import { toMessageString } from '@/lib/utils/text';
import { ensureIdString } from '@/lib/utils/ids';

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
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // ---------- الفئات (Leaf فقط) ----------
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    if (open)
      getCategoriesFlat(merchantId)
        .then(setCategories)
        .catch(() => setCategories([]));
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

  // ---------- نموذج المنتج ----------
  const [form, setForm] = useState<CreateProductDto>({
    name: '',
    description: '',
    category: '',
    price: 0,
    isAvailable: true,
    keywords: [],
    specsBlock: [],
    source: 'manual',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'price') {
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
  const [currency, setCurrency] = useState<Currency>('SAR');
  const [offer, setOffer] = useState<OfferForm>({ enabled: false });
  const [attributes, setAttributes] = useState<Record<string, string[]>>({});

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
      const okType = ['image/png', 'image/jpeg', 'image/webp'].includes(
        f.type
      );
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

    const newPrev: PreviewFile[] = toAdd.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setFileErrors(errs);
    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...newPrev]);

    if (e.target) e.target.value = '';
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
    'تحليل البيانات الأساسية',
    'توليد الكلمات الدليلية',
    'بناء المتجهات الدلالية',
    'ربط الروابط الذكية',
    'تحديث فهرس البحث',
  ];
  const [activeStep, setActiveStep] = useState<number>(-1); // -1 = مخفي
  const stepTimer = useRef<NodeJS.Timeout | null>(null);

  const startKaleemSimulation = () => {
    setActiveStep(0);
    stepTimer.current = setInterval(() => {
      setActiveStep((s) => (s >= steps.length - 1 ? s : s + 1));
    }, 700);
  };

  const stopKaleemSimulation = () => {
    if (stepTimer.current) {
      clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
    setActiveStep(steps.length - 1);
    setTimeout(() => setActiveStep(-1), 500);
  };

  useEffect(() => {
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      revokeAll();
    };
  }, []);

  // ---------- إرسال ----------
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    startKaleemSimulation();
    try {
      const payload: CreateProductDto = {
        ...form,
        category: ensureIdString(form.category),
        currency,
        offer: offer.enabled ? { ...offer } : { enabled: false },
        attributes,
        keywords: keywordTags,
        specsBlock: [...specTags],
        source: 'manual',
      };

      // 1) إنشاء المنتج
      const created = await createProduct(payload);
      const productId =
        typeof (created as any)?._id === 'string'
          ? (created as any)._id
          : (created as any)?._id?.toString?.() ??
            String((created as any)._id);

      // 2) رفع الصور (إن وجدت)
      if (files.length) {
        const res = await uploadProductImages(productId, files, false);
        if (res.remaining === 0 && files.length > res.accepted) {
          setFileErrors([`تم قبول ${res.accepted} صور فقط (الحد 6).`]);
        }
      }

      stopKaleemSimulation();
      setLoading(false);
      enqueueSnackbar(
        'تمت إضافة المنتج — كَلِيم صار يعرفه ويستدعيه في الردود 👌',
        { variant: 'success' }
      );
      onProductAdded?.();
      onClose();

      revokeAll();
      setPreviews([]);
    } catch (error: any) {
      stopKaleemSimulation();
      setLoading(false);

      const msg =
        error?.response?.data?.message ??
        error?.message ??
        'فشل في إضافة المنتج';

      const pretty = Array.isArray(msg) ? msg.join(' · ') : String(msg);

      setError(pretty);
      enqueueSnackbar(pretty, { variant: 'error' });
    }
  };

  // ---------- إعادة ضبط عند الفتح ----------
  useEffect(() => {
    if (open) {
      revokeAll();
      setForm({
        name: '',
        description: '',
        category: '',
        price: 0,
        isAvailable: true,
        keywords: [],
        specsBlock: [],
        source: 'manual',
      });
      setKeywordTags([]);
      setSpecTags([]);
      setCurrency('SAR');
      setOffer({ enabled: false });
      setAttributes({});
      setFiles([]);
      setPreviews([]);
      setFileErrors([]);
      setError(null);
      setActiveStep(-1);
    }
  }, [open]);

  const canSubmit =
    !!form.name?.trim() &&
    !!form.category &&
    Number.isFinite(form.price ?? 0) &&
    (form.price ?? 0) >= 0;

  return (
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
        <Card elevation={0} sx={{ mx: 3, mb: 1, mt: 1, bgcolor: 'primary.50' }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <SmartToyIcon color="primary" />
              <Typography fontWeight={600}>
                كَلِيم الآن يتعرّف على منتجك 🤖
              </Typography>
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
            label="الوصف"
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
          />

          {/* الفئة (Leaf فقط) */}
          <TextField
            select
            label="الفئة"
            name="category"
            value={form.category}
            fullWidth
            onChange={(e) =>
              handleSelectCategory(e as unknown as SelectChangeEvent<string>)
            }
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
            inputProps={{ min: 0, step: '0.5', inputMode: 'decimal' }}
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
            control={
              <Switch checked={form.isAvailable} onChange={handleSwitch} />
            }
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
            suggestions={[
              'إلكترونيات',
              'ملابس',
              'رجالي',
              'نسائي',
              'فاخر',
              'سريع',
            ]}
          />

          {/* مواصفات نصية سريعة */}
          <TagsInput
            label="مواصفات سريعة (نص)"
            value={specTags}
            onChange={setSpecTags}
            placeholder="مثال: بطارية قوية ثم Enter"
            suggestions={[
              'بطارية قوية',
              'مقاوم للماء',
              'ضمان سنتين',
              'خفيف الوزن',
            ]}
          />

          {/* السمات متعددة القيم */}
          <AttributesEditor value={attributes} onChange={setAttributes} />

          {/* رفع صور (حد 6 × 2MB) */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <Button
              variant="outlined"
              component="label"
              disabled={files.length >= MAX_FILES}
              sx={{ mr: 'auto' }}
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(3, 1fr)',
                  sm: 'repeat(4, 1fr)',
                  md: 'repeat(6, 1fr)',
                },
                gap: 1,
              }}
            >
              {previews.map((p, i) => (
                <Stack key={i} spacing={1} alignItems="center">
                  <Box
                    component="img"
                    src={p.url}
                    alt={p.file.name}
                    sx={{
                      width: '100%',
                      aspectRatio: '1/1',
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                  <Chip
                    label="إزالة"
                    size="small"
                    onClick={() => removeFile(i)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Stack>
              ))}
            </Box>
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
          {loading ? 'جارٍ الإضافة...' : 'إضافة'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

