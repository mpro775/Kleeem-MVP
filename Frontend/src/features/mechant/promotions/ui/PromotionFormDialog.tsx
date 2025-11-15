// src/features/mechant/promotions/ui/PromotionFormDialog.tsx
import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Autocomplete,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { getMerchantProducts } from "@/features/mechant/products/api";
import { getCategoriesFlat } from "@/features/mechant/categories/api";
import type { ProductResponse } from "@/features/mechant/products/type";
import type { Category } from "@/features/mechant/categories/type";
import type {
  Promotion,
  PromotionStatus,
  PromotionType,
  ApplyTo,
  CreatePromotionPayload,
  UpdatePromotionPayload,
} from "../type";

interface PromotionFormDialogProps {
  open: boolean;
  promotion?: Promotion | null;
  merchantId: string;
  loading?: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePromotionPayload) => Promise<void>;
  onUpdate: (payload: UpdatePromotionPayload) => Promise<void>;
}

type PromotionFormValues = {
  name: string;
  description: string;
  type: PromotionType;
  discountValue: string;
  maxDiscountAmount: string;
  minCartAmount: string;
  applyTo: ApplyTo;
  categoryIds: string[];
  productIds: string[];
  startDate: string;
  endDate: string;
  priority: string;
  countdownTimer: boolean;
  usageLimit: string;
  status: PromotionStatus;
};

const DEFAULT_VALUES: PromotionFormValues = {
  name: "",
  description: "",
  type: "percentage",
  discountValue: "",
  maxDiscountAmount: "",
  minCartAmount: "",
  applyTo: "all",
  categoryIds: [],
  productIds: [],
  startDate: "",
  endDate: "",
  priority: "",
  countdownTimer: false,
  usageLimit: "",
  status: "active",
};

const toDateInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

// Removed unused normalizeListInput function

const normalizeOptionalNumber = (
  value: string,
  previous?: number | null
): number | null | undefined => {
  if (!value) {
    if (previous !== null && previous !== undefined) {
      return null;
    }
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return undefined;
  }
  return numeric;
};

const normalizeOptionalDate = (
  value: string,
  previous?: string | null
): string | null | undefined => {
  if (!value) {
    if (previous) {
      return null;
    }
    return undefined;
  }
  return new Date(value).toISOString();
};

export default function PromotionFormDialog({
  open,
  promotion,
  merchantId,
  loading = false,
  onClose,
  onCreate,
  onUpdate,
}: PromotionFormDialogProps) {
  const isEdit = Boolean(promotion);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const applyTo = watch("applyTo");
  const type = watch("type");

  // جلب المنتجات والفئات عند فتح الـ Dialog
  useEffect(() => {
    if (!open || !merchantId) return;

    setLoadingProducts(true);
    getMerchantProducts(merchantId)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));

    setLoadingCategories(true);
    getCategoriesFlat(merchantId)
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, [open, merchantId]);

  useEffect(() => {
    if (!open) return;
    if (promotion) {
      reset({
        name: promotion.name,
        description: promotion.description ?? "",
        type: promotion.type,
        discountValue: promotion.discountValue?.toString() ?? "",
        maxDiscountAmount:
          promotion.maxDiscountAmount === null ||
          promotion.maxDiscountAmount === undefined
            ? ""
            : promotion.maxDiscountAmount.toString(),
        minCartAmount: promotion.minCartAmount?.toString() ?? "",
        applyTo: promotion.applyTo ?? "all",
        categoryIds: promotion.categoryIds ?? [],
        productIds: promotion.productIds ?? [],
        startDate: toDateInput(promotion.startDate),
        endDate: toDateInput(promotion.endDate),
        priority:
          promotion.priority !== undefined ? promotion.priority.toString() : "",
        countdownTimer: promotion.countdownTimer ?? false,
        usageLimit:
          promotion.usageLimit === null || promotion.usageLimit === undefined
            ? ""
            : promotion.usageLimit.toString(),
        status: promotion.status,
      });
    } else {
      reset({
        ...DEFAULT_VALUES,
        status: "active",
      });
    }
  }, [promotion, open, reset]);

  const submitHandler = handleSubmit(async (values) => {
    const commonFields: UpdatePromotionPayload = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      type: values.type,
      discountValue: Number(values.discountValue),
      maxDiscountAmount: normalizeOptionalNumber(
        values.maxDiscountAmount,
        promotion?.maxDiscountAmount
      ),
      minCartAmount: normalizeOptionalNumber(
        values.minCartAmount,
        promotion?.minCartAmount
      ) ?? 0,
      applyTo: values.applyTo,
      categoryIds: values.categoryIds && values.categoryIds.length > 0 ? values.categoryIds : undefined,
      productIds: values.productIds && values.productIds.length > 0 ? values.productIds : undefined,
      startDate: normalizeOptionalDate(values.startDate, promotion?.startDate),
      endDate: normalizeOptionalDate(values.endDate, promotion?.endDate),
      priority: normalizeOptionalNumber(values.priority, promotion?.priority) ?? 0,
      countdownTimer: values.countdownTimer,
      usageLimit: normalizeOptionalNumber(values.usageLimit, promotion?.usageLimit),
    };

    if (!isEdit) {
      const payload: CreatePromotionPayload = {
        merchantId,
        ...commonFields,
      } as CreatePromotionPayload;
      await onCreate(payload);
    } else {
      const payload: UpdatePromotionPayload = {
        ...commonFields,
        status: values.status,
      };
      await onUpdate(payload);
    }
  });

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="promotion-form-title"
    >
      <DialogTitle id="promotion-form-title" sx={{ fontWeight: 800 }}>
        {isEdit ? "تعديل العرض الترويجي" : "إنشاء عرض ترويجي جديد"}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              label="اسم الحملة"
              fullWidth
              {...register("name", {
                required: "اسم الحملة مطلوب",
                minLength: { value: 3, message: "الاسم يجب أن لا يقل عن 3 أحرف" },
              })}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
            />

            <TextField
              label="وصف مختصر"
              fullWidth
              {...register("description")}
              placeholder="مثال: خصم 30% على نهاية الموسم"
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
          >
            <Controller
              name="type"
              control={control}
              rules={{ required: "نوع العرض مطلوب" }}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.type)}>
                  <InputLabel id="promotion-type-label">نوع العرض</InputLabel>
                  <Select
                    labelId="promotion-type-label"
                    label="نوع العرض"
                    {...field}
                  >
                    <MenuItem value="percentage">خصم بنسبة</MenuItem>
                    <MenuItem value="fixed_amount">خصم بمبلغ ثابت</MenuItem>
                    <MenuItem value="cart_threshold">خصم عند حد السلة</MenuItem>
                  </Select>
                  <FormHelperText>{errors.type?.message}</FormHelperText>
                </FormControl>
              )}
            />

            <TextField
              label="قيمة الخصم"
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...register("discountValue", {
                required: "قيمة الخصم مطلوبة",
                validate: (val) =>
                  Number(val) >= 0 || "القيمة يجب أن تكون أكبر من أو تساوي صفر",
              })}
              error={Boolean(errors.discountValue)}
              helperText={
                errors.discountValue?.message ??
                (type === "percentage"
                  ? "إذا كان الخصم نسبة، أدخل قيمة بين 0 و 100."
                  : "أدخل قيمة الخصم بالريال السعودي.")
              }
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
          >
            <TextField
              label="الحد الأقصى للخصم"
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...register("maxDiscountAmount")}
              helperText="يُستخدم للخصومات النسبية، اتركه فارغاً لتعطيله."
            />

            <TextField
              label="الحد الأدنى للسلة"
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...register("minCartAmount")}
              helperText="أدخل 0 في حال عدم وجود حد أدنى."
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
          >
            <Controller
              name="applyTo"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="promotion-apply-label">نطاق التطبيق</InputLabel>
                  <Select
                    labelId="promotion-apply-label"
                    label="نطاق التطبيق"
                    {...field}
                  >
                    <MenuItem value="all">كل المنتجات</MenuItem>
                    <MenuItem value="categories">فئات محددة</MenuItem>
                    <MenuItem value="products">منتجات محددة</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <TextField
              label="الأولوية"
              type="number"
              inputProps={{ min: 0, step: 1 }}
              fullWidth
              {...register("priority")}
              helperText="الأولوية الأعلى تطبق أولاً عند تعارض العروض."
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
          >
            <TextField
              label="تاريخ البداية"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register("startDate")}
            />
            <TextField
              label="تاريخ النهاية"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register("endDate")}
            />
          </Stack>

          <Controller
            name="countdownTimer"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                }
                label="عرض عداد تنازلي في المتجر"
              />
            )}
          />

          <TextField
            label="حد الاستخدام الكلي"
            type="number"
            inputProps={{ min: 1, step: 1 }}
            {...register("usageLimit")}
            helperText="اتركه فارغاً ليكون غير محدود."
          />

          {applyTo === "categories" ? (
            <Controller
              name="categoryIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={categories}
                  getOptionLabel={(option) => option.name}
                  value={categories.filter((cat) => field.value?.includes(cat._id))}
                  onChange={(_, newValue) => {
                    field.onChange(newValue.map((cat) => cat._id));
                  }}
                  loading={loadingCategories}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اختر الفئات"
                      placeholder="ابحث واختر الفئات..."
                      helperText="اختر الفئات التي ينطبق عليها العرض الترويجي"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingCategories ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option._id}
                        label={option.name}
                      />
                    ))
                  }
                />
              )}
            />
          ) : null}

          {applyTo === "products" ? (
            <Controller
              name="productIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={products}
                  getOptionLabel={(option) => option.name}
                  value={products.filter((prod) => field.value?.includes(prod._id || prod.id || ""))}
                  onChange={(_, newValue) => {
                    field.onChange(newValue.map((prod) => prod._id || prod.id));
                  }}
                  loading={loadingProducts}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اختر المنتجات"
                      placeholder="ابحث واختر المنتجات..."
                      helperText="اختر المنتجات التي ينطبق عليها العرض الترويجي"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingProducts ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option._id || option.id}
                        label={option.name}
                      />
                    ))
                  }
                />
              )}
            />
          ) : null}

          {isEdit ? (
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="promotion-status-label">الحالة</InputLabel>
                  <Select
                    labelId="promotion-status-label"
                    label="الحالة"
                    {...field}
                  >
                    <MenuItem value="active">نشط</MenuItem>
                    <MenuItem value="inactive">متوقف</MenuItem>
                    <MenuItem value="scheduled">مجدول</MenuItem>
                    <MenuItem value="expired">منتهي</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          onClick={() => submitHandler()}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {isEdit ? "حفظ التعديلات" : "إنشاء العرض"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

