'use client';

import { useState } from 'react';
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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useCreatePromotion } from '@/features/merchant/promotions';
import { CreatePromotionDto } from '@/features/merchant/coupons/types';
import { useAuth } from '@/lib/hooks/auth';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function CreatePromotionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const merchantId = user?.merchantId || '';

  const createMutation = useCreatePromotion();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreatePromotionDto>({
    defaultValues: {
      type: 'percentage',
      applyTo: 'all',
      priority: 10,
      countdownTimer: false,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    },
  });

  const promotionType = watch('type');

  const onSubmit = async (data: CreatePromotionDto) => {
    try {
      setError(null);
      await createMutation.mutateAsync({
        merchantId,
        data,
      });
      router.push('/ar/dashboard/promotions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إنشاء العرض');
    }
  };

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
          إنشاء عرض ترويجي جديد
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
                      label="تفعيل العرض فوراً"
                    />
                  )}
                />
              </FormControl>
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
                  disabled={createMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء العرض'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

