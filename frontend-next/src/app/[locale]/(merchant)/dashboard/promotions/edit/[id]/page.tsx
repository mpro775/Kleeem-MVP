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
import { usePromotion, useUpdatePromotion } from '@/features/merchant/promotions';
import { UpdatePromotionDto } from '@/features/merchant/coupons/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPromotionPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const { data: promotion, isLoading } = usePromotion(id);
  const updateMutation = useUpdatePromotion();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdatePromotionDto>();

  const promotionType = watch('type');

  // Reset form when promotion data is loaded
  useEffect(() => {
    if (promotion) {
      reset({
        name: promotion.name,
        description: promotion.description,
        type: promotion.type,
        discountValue: promotion.discountValue,
        minCartAmount: promotion.minCartAmount,
        maxDiscountAmount: promotion.maxDiscountAmount,
        applyTo: promotion.applyTo,
        priority: promotion.priority,
        usageLimit: promotion.usageLimit,
        countdownTimer: promotion.countdownTimer,
        startDate: new Date(promotion.startDate).toISOString().split('T')[0],
        endDate: new Date(promotion.endDate).toISOString().split('T')[0],
        isActive: promotion.isActive,
      });
    }
  }, [promotion, reset]);

  const onSubmit = async (data: UpdatePromotionDto) => {
    try {
      setError(null);
      await updateMutation.mutateAsync({ id, data });
      router.push('/ar/dashboard/promotions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحديث العرض');
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

  if (!promotion) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">العرض غير موجود</Alert>
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
          تعديل العرض: {promotion.name}
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
            {/* الاسم */}
            <Grid item xs={12}>
              <TextField
                label="اسم العرض"
                fullWidth
                required
                {...register('name', { required: 'الاسم مطلوب' })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
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

            {/* نوع العرض */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="نوع العرض"
                fullWidth
                required
                {...register('type', { required: 'النوع مطلوب' })}
                error={!!errors.type}
                helperText={errors.type?.message}
              >
                <MenuItem value="percentage">خصم نسبة مئوية</MenuItem>
                <MenuItem value="fixed_amount">خصم مبلغ ثابت</MenuItem>
                <MenuItem value="cart_threshold">خصم عند الوصول لمبلغ معين</MenuItem>
              </TextField>
            </Grid>

            {/* قيمة الخصم */}
            <Grid item xs={12} md={6}>
              <TextField
                label={
                  promotionType === 'percentage'
                    ? 'نسبة الخصم (%)'
                    : 'مبلغ الخصم (ريال)'
                }
                type="number"
                fullWidth
                required
                {...register('discountValue', {
                  required: 'القيمة مطلوبة',
                  min: { value: 1, message: 'القيمة يجب أن تكون أكبر من 0' },
                  max:
                    promotionType === 'percentage'
                      ? { value: 100, message: 'النسبة لا يمكن أن تتجاوز 100%' }
                      : undefined,
                })}
                error={!!errors.discountValue}
                helperText={errors.discountValue?.message}
                inputProps={{ step: promotionType === 'percentage' ? 1 : 0.01 }}
              />
            </Grid>

            {/* الحد الأدنى للسلة */}
            <Grid item xs={12} md={6}>
              <TextField
                label="الحد الأدنى لمبلغ السلة (ريال)"
                type="number"
                fullWidth
                {...register('minCartAmount', {
                  min: { value: 0, message: 'القيمة يجب أن تكون 0 أو أكثر' },
                })}
                error={!!errors.minCartAmount}
                helperText={
                  errors.minCartAmount?.message ||
                  'اتركه فارغاً إذا لم يكن هناك حد أدنى'
                }
                inputProps={{ step: 0.01 }}
              />
            </Grid>

            {/* الحد الأقصى للخصم */}
            {promotionType === 'percentage' && (
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

            {/* نطاق التطبيق */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="نطاق التطبيق"
                fullWidth
                required
                {...register('applyTo', { required: 'نطاق التطبيق مطلوب' })}
                error={!!errors.applyTo}
                helperText={errors.applyTo?.message}
              >
                <MenuItem value="all">جميع المنتجات</MenuItem>
                <MenuItem value="categories">فئات محددة</MenuItem>
                <MenuItem value="products">منتجات محددة</MenuItem>
              </TextField>
            </Grid>

            {/* الأولوية */}
            <Grid item xs={12} md={6}>
              <TextField
                label="الأولوية"
                type="number"
                fullWidth
                {...register('priority', {
                  min: { value: 1, message: 'الأولوية يجب أن تكون 1 أو أكثر' },
                })}
                error={!!errors.priority}
                helperText={
                  errors.priority?.message || 'الأولوية الأعلى تطبق أولاً (1 = الأعلى)'
                }
                inputProps={{ step: 1 }}
              />
            </Grid>

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

            {/* إعدادات إضافية */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">إعدادات إضافية</FormLabel>
                <Controller
                  name="countdownTimer"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="عرض عداد تنازلي للعملاء"
                    />
                  )}
                />
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="العرض نشط"
                    />
                  )}
                />
              </FormControl>
            </Grid>

            {/* معلومات الاستخدام */}
            <Grid item xs={12}>
              <Alert severity="info">
                تم استخدام هذا العرض {promotion.usageCount} مرة حتى الآن
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

