'use client';

import { useState, useEffect, use } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Alert,
  Skeleton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useCoupon, useUpdateCoupon } from '@/features/merchant/coupons';
import { UpdateCouponDto } from '@/features/merchant/coupons/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCouponPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const { data: coupon, isLoading } = useCoupon(id);
  const updateMutation = useUpdateCoupon();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateCouponDto>();

  const couponType = watch('type');

  // Reset form when coupon data is loaded
  useEffect(() => {
    if (coupon) {
      reset({
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimit: coupon.usageLimit,
        oneTimePerCustomer: coupon.oneTimePerCustomer,
        storeWide: coupon.storeWide,
        startDate: new Date(coupon.startDate).toISOString().split('T')[0],
        endDate: new Date(coupon.endDate).toISOString().split('T')[0],
        isActive: coupon.isActive,
      });
    }
  }, [coupon, reset]);

  const onSubmit = async (data: UpdateCouponDto) => {
    try {
      setError(null);
      await updateMutation.mutateAsync({
        id,
        data: {
          ...data,
          code: data.code?.toUpperCase(),
        },
      });
      router.push('/ar/dashboard/coupons');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحديث الكوبون');
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={600} />
      </Container>
    );
  }

  if (!coupon) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">الكوبون غير موجود</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* العنوان */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          رجوع
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          تعديل الكوبون: {coupon.code}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* النموذج */}
      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* الكود */}
            <Grid item xs={12} md={6}>
              <TextField
                label="كود الكوبون"
                fullWidth
                required
                {...register('code', {
                  required: 'الكود مطلوب',
                  minLength: { value: 3, message: 'الكود يجب أن يكون 3 أحرف على الأقل' },
                })}
                error={!!errors.code}
                helperText={errors.code?.message}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>

            {/* النوع */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="نوع الكوبون"
                fullWidth
                required
                {...register('type', { required: 'النوع مطلوب' })}
                error={!!errors.type}
                helperText={errors.type?.message}
              >
                <MenuItem value="percentage">خصم نسبة مئوية</MenuItem>
                <MenuItem value="fixed_amount">خصم مبلغ ثابت</MenuItem>
                <MenuItem value="free_shipping">شحن مجاني</MenuItem>
              </TextField>
            </Grid>

            {/* الوصف */}
            <Grid item xs={12}>
              <TextField
                label="الوصف"
                fullWidth
                required
                multiline
                rows={3}
                {...register('description', { required: 'الوصف مطلوب' })}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            </Grid>

            {/* القيمة */}
            {couponType !== 'free_shipping' && (
              <Grid item xs={12} md={6}>
                <TextField
                  label={
                    couponType === 'percentage'
                      ? 'نسبة الخصم (%)'
                      : 'مبلغ الخصم (ريال)'
                  }
                  type="number"
                  fullWidth
                  required
                  {...register('value', {
                    required: 'القيمة مطلوبة',
                    min: { value: 1, message: 'القيمة يجب أن تكون أكبر من 0' },
                    max:
                      couponType === 'percentage'
                        ? { value: 100, message: 'النسبة لا يمكن أن تتجاوز 100%' }
                        : undefined,
                  })}
                  error={!!errors.value}
                  helperText={errors.value?.message}
                  inputProps={{ step: couponType === 'percentage' ? 1 : 0.01 }}
                />
              </Grid>
            )}

            {/* الحد الأدنى للطلب */}
            <Grid item xs={12} md={6}>
              <TextField
                label="الحد الأدنى لمبلغ الطلب (ريال)"
                type="number"
                fullWidth
                {...register('minOrderAmount', {
                  min: { value: 0, message: 'القيمة يجب أن تكون 0 أو أكثر' },
                })}
                error={!!errors.minOrderAmount}
                helperText={
                  errors.minOrderAmount?.message || 'اتركه فارغاً إذا لم يكن هناك حد أدنى'
                }
                inputProps={{ step: 0.01 }}
              />
            </Grid>

            {/* الحد الأقصى للخصم */}
            {couponType === 'percentage' && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="الحد الأقصى لمبلغ الخصم (ريال)"
                  type="number"
                  fullWidth
                  {...register('maxDiscountAmount', {
                    min: { value: 0, message: 'القيمة يجب أن تكون 0 أو أكثر' },
                  })}
                  error={!!errors.maxDiscountAmount}
                  helperText={
                    errors.maxDiscountAmount?.message ||
                    'اتركه فارغاً إذا لم يكن هناك حد أقصى'
                  }
                  inputProps={{ step: 0.01 }}
                />
              </Grid>
            )}

            {/* عدد مرات الاستخدام */}
            <Grid item xs={12} md={6}>
              <TextField
                label="عدد مرات الاستخدام المسموح بها"
                type="number"
                fullWidth
                {...register('usageLimit', {
                  min: { value: 1, message: 'العدد يجب أن يكون 1 أو أكثر' },
                })}
                error={!!errors.usageLimit}
                helperText={
                  errors.usageLimit?.message || 'اتركه فارغاً للسماح باستخدام غير محدود'
                }
                inputProps={{ step: 1 }}
              />
            </Grid>

            {/* تاريخ البداية */}
            <Grid item xs={12} md={6}>
              <TextField
                label="تاريخ البداية"
                type="date"
                fullWidth
                required
                {...register('startDate', { required: 'تاريخ البداية مطلوب' })}
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* تاريخ النهاية */}
            <Grid item xs={12} md={6}>
              <TextField
                label="تاريخ النهاية"
                type="date"
                fullWidth
                required
                {...register('endDate', { required: 'تاريخ النهاية مطلوب' })}
                error={!!errors.endDate}
                helperText={errors.endDate?.message}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* نطاق التطبيق */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">نطاق التطبيق</FormLabel>
                <Controller
                  name="storeWide"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="تطبيق على كامل المتجر"
                    />
                  )}
                />
              </FormControl>
            </Grid>

            {/* إعدادات إضافية */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">إعدادات إضافية</FormLabel>
                <Controller
                  name="oneTimePerCustomer"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="استخدام واحد لكل عميل"
                    />
                  )}
                />
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="الكوبون نشط"
                    />
                  )}
                />
              </FormControl>
            </Grid>

            {/* معلومات الاستخدام */}
            <Grid item xs={12}>
              <Alert severity="info">
                تم استخدام هذا الكوبون {coupon.usageCount} مرة حتى الآن
              </Alert>
            </Grid>

            {/* أزرار الإجراءات */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'flex-end',
                  mt: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => router.back()}
                  disabled={updateMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'جاري التحديث...' : 'حفظ التغييرات'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

