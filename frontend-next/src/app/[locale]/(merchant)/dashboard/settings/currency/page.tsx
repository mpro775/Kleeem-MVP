'use client';

import { useState, useEffect } from 'react';
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
  Autocomplete,
  Chip,
  Divider,
  Skeleton,
  IconButton,
} from '@mui/material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  useCurrencySettings,
  useUpdateCurrencySettings,
  useDiscountPolicy,
  useUpdateDiscountPolicy,
} from '@/features/merchant/currency-settings';
import {
  UpdateCurrencySettingsDto,
  UpdateDiscountPolicyDto,
} from '@/features/merchant/coupons/types';
import { useAuth } from '@/lib/hooks/auth';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const AVAILABLE_CURRENCIES = [
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'EUR', name: 'يورو' },
  { code: 'GBP', name: 'جنيه إسترليني' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'YER', name: 'ريال يمني' },
  { code: 'EGP', name: 'جنيه مصري' },
  { code: 'KWD', name: 'دينار كويتي' },
  { code: 'QAR', name: 'ريال قطري' },
  { code: 'BHD', name: 'دينار بحريني' },
  { code: 'OMR', name: 'ريال عماني' },
];

export default function CurrencySettingsPage() {
  const { user } = useAuth();
  const merchantId = user?.merchantId || '';

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: currencySettings, isLoading: currencyLoading } =
    useCurrencySettings(merchantId);
  const { data: discountPolicy, isLoading: policyLoading } =
    useDiscountPolicy(merchantId);

  // Mutations
  const updateCurrencyMutation = useUpdateCurrencySettings();
  const updatePolicyMutation = useUpdateDiscountPolicy();

  // Form for Currency Settings
  const {
    register: registerCurrency,
    control: controlCurrency,
    handleSubmit: handleSubmitCurrency,
    reset: resetCurrency,
    watch: watchCurrency,
    formState: { errors: errorsCurrency },
  } = useForm<UpdateCurrencySettingsDto>();

  // Form for Discount Policy
  const {
    register: registerPolicy,
    control: controlPolicy,
    handleSubmit: handleSubmitPolicy,
    reset: resetPolicy,
    formState: { errors: errorsPolicy },
  } = useForm<UpdateDiscountPolicyDto>();

  const { fields, append, remove } = useFieldArray({
    control: controlCurrency,
    name: 'exchangeRates' as any,
  });

  const supportedCurrencies = watchCurrency('supportedCurrencies') || [];

  // Reset forms when data is loaded
  useEffect(() => {
    if (currencySettings) {
      resetCurrency({
        baseCurrency: currencySettings.baseCurrency,
        supportedCurrencies: currencySettings.supportedCurrencies,
        roundingStrategy: currencySettings.roundingStrategy,
        roundToNearest: currencySettings.roundToNearest,
      });
    }
  }, [currencySettings, resetCurrency]);

  useEffect(() => {
    if (discountPolicy) {
      resetPolicy({
        stackCouponsWithPromotions: discountPolicy.stackCouponsWithPromotions,
        applyOrder: discountPolicy.applyOrder,
      });
    }
  }, [discountPolicy, resetPolicy]);

  const onSubmitCurrency = async (data: UpdateCurrencySettingsDto) => {
    try {
      setErrorMessage(null);
      await updateCurrencyMutation.mutateAsync({ merchantId, data });
      setSuccessMessage('تم حفظ إعدادات العملات بنجاح');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات'
      );
    }
  };

  const onSubmitPolicy = async (data: UpdateDiscountPolicyDto) => {
    try {
      setErrorMessage(null);
      await updatePolicyMutation.mutateAsync({ merchantId, data });
      setSuccessMessage('تم حفظ سياسة الخصومات بنجاح');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات'
      );
    }
  };

  if (currencyLoading || policyLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* العنوان */}
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>
        إعدادات العملات والخصومات
      </Typography>

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* إعدادات العملات */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          إعدادات العملات
        </Typography>

        <form onSubmit={handleSubmitCurrency(onSubmitCurrency)}>
          <Grid container spacing={3}>
            {/* العملة الأساسية */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="العملة الأساسية"
                fullWidth
                {...registerCurrency('baseCurrency')}
                error={!!errorsCurrency.baseCurrency}
                helperText={
                  errorsCurrency.baseCurrency?.message ||
                  'العملة التي ستعرض بها الأسعار افتراضياً'
                }
              >
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.name} ({currency.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* العملات المدعومة */}
            <Grid item xs={12}>
              <Controller
                name="supportedCurrencies"
                control={controlCurrency}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={AVAILABLE_CURRENCIES.map((c) => c.code)}
                    value={field.value || []}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="العملات المدعومة"
                        helperText="اختر العملات التي تريد دعمها في متجرك"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const currency = AVAILABLE_CURRENCIES.find(
                          (c) => c.code === option
                        );
                        return (
                          <Chip
                            label={currency?.name || option}
                            {...getTagProps({ index })}
                            key={option}
                          />
                        );
                      })
                    }
                  />
                )}
              />
            </Grid>

            {/* أسعار الصرف */}
            {supportedCurrencies &&
              supportedCurrencies.length > 0 &&
              supportedCurrencies.map((currency) => {
                if (currency === currencySettings?.baseCurrency) return null;
                return (
                  <Grid item xs={12} md={6} key={currency}>
                    <TextField
                      label={`سعر صرف ${
                        AVAILABLE_CURRENCIES.find((c) => c.code === currency)
                          ?.name || currency
                      }`}
                      type="number"
                      fullWidth
                      defaultValue={
                        currencySettings?.exchangeRates?.[currency] || 1
                      }
                      helperText={`كم ${currencySettings?.baseCurrency} = 1 ${currency}`}
                      inputProps={{ step: 0.0001 }}
                    />
                  </Grid>
                );
              })}

            {/* استراتيجية التقريب */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="استراتيجية التقريب"
                fullWidth
                {...registerCurrency('roundingStrategy')}
              >
                <MenuItem value="none">بدون تقريب</MenuItem>
                <MenuItem value="round">تقريب عادي</MenuItem>
                <MenuItem value="ceil">تقريب لأعلى</MenuItem>
                <MenuItem value="floor">تقريب لأسفل</MenuItem>
              </TextField>
            </Grid>

            {/* التقريب لأقرب */}
            <Grid item xs={12} md={6}>
              <TextField
                label="التقريب لأقرب"
                type="number"
                fullWidth
                {...registerCurrency('roundToNearest', {
                  min: { value: 1, message: 'القيمة يجب أن تكون 1 أو أكثر' },
                })}
                error={!!errorsCurrency.roundToNearest}
                helperText={
                  errorsCurrency.roundToNearest?.message ||
                  'مثال: 5 = تقريب لأقرب 5 ريال'
                }
                inputProps={{ step: 1 }}
              />
            </Grid>

            {/* زر الحفظ */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateCurrencyMutation.isPending}
              >
                {updateCurrencyMutation.isPending
                  ? 'جاري الحفظ...'
                  : 'حفظ إعدادات العملات'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* سياسة الخصومات */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          سياسة الخصومات
        </Typography>

        <form onSubmit={handleSubmitPolicy(onSubmitPolicy)}>
          <Grid container spacing={3}>
            {/* السماح بالتراكم */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  تراكم الكوبونات مع العروض الترويجية
                </FormLabel>
                <Controller
                  name="stackCouponsWithPromotions"
                  control={controlPolicy}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label={
                        field.value
                          ? 'السماح بتطبيق الكوبونات مع العروض الترويجية معاً'
                          : 'تطبيق الخصم الأعلى فقط (كوبون أو عرض)'
                      }
                    />
                  )}
                />
              </FormControl>
            </Grid>

            {/* ترتيب التطبيق */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="ترتيب تطبيق الخصومات"
                fullWidth
                {...registerPolicy('applyOrder')}
                helperText="تحديد الترتيب الذي تطبق به الخصومات المختلفة"
              >
                <MenuItem value="product_first">
                  خصومات المنتجات ← العروض ← الكوبونات
                </MenuItem>
                <MenuItem value="promotion_first">
                  العروض الترويجية ← خصومات المنتجات ← الكوبونات
                </MenuItem>
                <MenuItem value="coupon_first">
                  الكوبونات ← العروض ← خصومات المنتجات
                </MenuItem>
              </TextField>
            </Grid>

            {/* زر الحفظ */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={updatePolicyMutation.isPending}
              >
                {updatePolicyMutation.isPending
                  ? 'جاري الحفظ...'
                  : 'حفظ سياسة الخصومات'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* معلومات إضافية */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>ملاحظة:</strong> تغيير إعدادات العملات وسياسة الخصومات سيؤثر على:
        </Typography>
        <ul>
          <li>الأسعار المعروضة للعملاء في المتجر</li>
          <li>طريقة حساب الخصومات في الطلبات الجديدة</li>
          <li>العملة المستخدمة في الفواتير والتقارير</li>
        </ul>
      </Alert>
    </Container>
  );
}

