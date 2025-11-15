// src/features/mechant/coupons/ui/CouponFormDialog.tsx
import { useEffect, useState } from "react";
import {
  Box,
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
  Typography,
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
  Coupon,
  CouponStatus,
  CouponType,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../type";

interface CouponFormDialogProps {
  open: boolean;
  coupon?: Coupon | null;
  merchantId: string;
  loading?: boolean;
  onClose: () => void;
  onCreate: (payload: CreateCouponPayload) => Promise<void>;
  onUpdate: (payload: UpdateCouponPayload) => Promise<void>;
}

type CouponFormValues = {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  oneTimePerCustomer: boolean;
  allowedCustomers: string;
  storeWide: boolean;
  products: string[];
  categories: string[];
  startDate: string;
  endDate: string;
  status: CouponStatus;
};

const DEFAULT_VALUES: CouponFormValues = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  oneTimePerCustomer: false,
  allowedCustomers: "",
  storeWide: true,
  products: [],
  categories: [],
  startDate: "",
  endDate: "",
  status: "active",
};

const toDateInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const normalizeListInput = (
  input: string,
  previous?: string[] | null
): string[] | undefined => {
  const items = input
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length > 0) {
    return items;
  }

  if (previous && previous.length > 0) {
    return [];
  }

  return undefined;
};

function normalizeOptionalNumber(
  value: string,
  previous?: number | null
): number | undefined;
function normalizeOptionalNumber(
  value: string,
  previous: number | null | undefined,
  allowNull: true
): number | null | undefined;
function normalizeOptionalNumber(
  value: string,
  previous?: number | null,
  allowNull?: boolean
): number | null | undefined {
  const canReturnNull = allowNull === true;

  if (!value) {
    if (canReturnNull && previous !== undefined && previous !== null) {
      return null;
    }
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return undefined;
  }
  return numeric;
}

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
  const iso = new Date(value).toISOString();
  return iso;
};

export default function CouponFormDialog({
  open,
  coupon,
  merchantId,
  loading = false,
  onClose,
  onCreate,
  onUpdate,
}: CouponFormDialogProps) {
  const isEdit = Boolean(coupon);
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
  } = useForm<CouponFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const storeWide = watch("storeWide");

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
    if (coupon) {
      reset({
        code: coupon.code,
        description: coupon.description ?? "",
        type: coupon.type,
        value: coupon.value?.toString() ?? "",
        minOrderAmount: coupon.minOrderAmount?.toString() ?? "",
        maxDiscountAmount:
          coupon.maxDiscountAmount === null || coupon.maxDiscountAmount === undefined
            ? ""
            : coupon.maxDiscountAmount.toString(),
        usageLimit:
          coupon.usageLimit === null || coupon.usageLimit === undefined
            ? ""
            : coupon.usageLimit.toString(),
        oneTimePerCustomer: coupon.oneTimePerCustomer ?? false,
        allowedCustomers: coupon.allowedCustomers?.join("\n") ?? "",
        storeWide: coupon.storeWide,
        products: coupon.products ?? [],
        categories: coupon.categories ?? [],
        startDate: toDateInput(coupon.startDate),
        endDate: toDateInput(coupon.endDate),
        status: coupon.status,
      });
    } else {
      reset({
        ...DEFAULT_VALUES,
        status: "active",
      });
    }
  }, [coupon, open, reset]);

  const submitHandler = handleSubmit(async (values) => {
    const commonFields: Omit<UpdateCouponPayload, "status"> = {
      description: values.description.trim() || undefined,
      type: values.type,
      value: Number(values.value),
      minOrderAmount: normalizeOptionalNumber(values.minOrderAmount, coupon?.minOrderAmount),
      maxDiscountAmount: normalizeOptionalNumber(values.maxDiscountAmount, coupon?.maxDiscountAmount, true),
      usageLimit: normalizeOptionalNumber(values.usageLimit, coupon?.usageLimit, true),
      oneTimePerCustomer: values.oneTimePerCustomer,
      allowedCustomers: normalizeListInput(values.allowedCustomers, coupon?.allowedCustomers),
      storeWide: values.storeWide,
      products: values.products && values.products.length > 0 ? values.products : undefined,
      categories: values.categories && values.categories.length > 0 ? values.categories : undefined,
      startDate: normalizeOptionalDate(values.startDate, coupon?.startDate),
      endDate: normalizeOptionalDate(values.endDate, coupon?.endDate),
    };

    if (!isEdit) {
      const payload: CreateCouponPayload = {
        merchantId,
        code: values.code.trim().toUpperCase(),
        ...commonFields,
      };
      await onCreate(payload);
    } else {
      const payload: UpdateCouponPayload = {
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
      aria-labelledby="coupon-form-title"
    >
      <DialogTitle id="coupon-form-title" sx={{ fontWeight: 800 }}>
        {isEdit ? "تعديل الكوبون" : "إنشاء كوبون جديد"}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              label="كود الكوبون"
              fullWidth
              disabled={isEdit}
              InputProps={{ readOnly: isEdit, sx: { fontFamily: "monospace" } }}
              {...register("code", {
                required: !isEdit ? "الكود مطلوب" : false,
                minLength: { value: 3, message: "الكود يجب أن لا يقل عن 3 أحرف" },
                maxLength: { value: 20, message: "الكود يجب أن لا يزيد عن 20 حرف" },
              })}
              error={Boolean(errors.code)}
              helperText={
                errors.code?.message ??
                (!isEdit ? "استخدم أحرف كبيرة وأرقام لسهولة التذكر." : "لا يمكن تعديل الكود بعد الإنشاء.")
              }
            />

            <TextField
              label="الوصف المختصر"
              fullWidth
              {...register("description")}
              placeholder="مثال: خصم 20% على الطلب الأول"
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
              rules={{ required: "نوع الخصم مطلوب" }}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.type)}>
                  <InputLabel id="coupon-type-label">نوع الخصم</InputLabel>
                  <Select
                    labelId="coupon-type-label"
                    label="نوع الخصم"
                    {...field}
                  >
                    <MenuItem value="percentage">خصم بنسبة</MenuItem>
                    <MenuItem value="fixed_amount">خصم بمبلغ ثابت</MenuItem>
                    <MenuItem value="free_shipping">شحن مجاني</MenuItem>
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
              {...register("value", {
                required: "قيمة الخصم مطلوبة",
                validate: (val) =>
                  Number(val) >= 0 || "القيمة يجب أن تكون أكبر من أو تساوي صفر",
              })}
              error={Boolean(errors.value)}
              helperText={
                errors.value?.message ??
                (watch("type") === "percentage"
                  ? "إذا كان الخصم نسبة، أدخل قيمة بين 0 و 100."
                  : "أدخل قيمة المبلغ بالريال السعودي.")
              }
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
          >
            <TextField
              label="الحد الأدنى للطلب"
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...register("minOrderAmount")}
              helperText="اتركه فارغاً إذا لم يكن هناك حد أدنى."
            />

            <TextField
              label="الحد الأقصى للخصم"
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...register("maxDiscountAmount")}
              helperText="يُستخدم فقط للخصومات النسبية، اتركه فارغاً لتعطيله."
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              label="الحد الأقصى لعدد الاستخدامات"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              {...register("usageLimit")}
              helperText="اتركه فارغاً ليكون غير محدود."
            />

            {isEdit ? (
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="coupon-status-label">الحالة</InputLabel>
                    <Select
                      labelId="coupon-status-label"
                      label="الحالة"
                      {...field}
                    >
                      <MenuItem value="active">نشط</MenuItem>
                      <MenuItem value="inactive">متوقف</MenuItem>
                      <MenuItem value="expired">منتهي</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            ) : (
              <Box />
            )}
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              label="تاريخ البداية"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register("startDate")}
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register("endDate")}
            />
          </Stack>

          <Controller
            name="oneTimePerCustomer"
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
                label="السماح باستخدام واحد لكل عميل"
              />
            )}
          />

          <TextField
            label="أرقام العملاء المسموح لهم"
            multiline
            minRows={2}
            {...register("allowedCustomers")}
            placeholder="أدخل الأرقام مفصولة بفواصل أو أسطر"
            helperText="اتركه فارغاً للسماح لجميع العملاء. سيتم تطبيق استخدام واحد لكل عميل في حال تفعيله."
          />

          <Controller
            name="storeWide"
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
                label="تطبيق الكوبون على كامل المتجر"
              />
            )}
          />

          {!storeWide ? (
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.secondary">
                قم بتحديد المنتجات أو الفئات التي ينطبق عليها الكوبون.
              </Typography>
              <Controller
                name="products"
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
                        helperText="اختر المنتجات التي ينطبق عليها الكوبون"
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
              <Controller
                name="categories"
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
                        helperText="اختر الفئات التي ينطبق عليها الكوبون"
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
            </Stack>
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
          {isEdit ? "حفظ التعديلات" : "إنشاء الكوبون"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

