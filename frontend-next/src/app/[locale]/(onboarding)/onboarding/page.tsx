'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import { MuiTelInput, matchIsValidTel } from 'mui-tel-input';
import { LuStore } from 'react-icons/lu';
import { MdOutlineBusiness } from 'react-icons/md';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';

import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import { saveBasicInfo, ensureMerchant } from '@/features/onboarding/api';
import {
  BUSINESS_TYPES,
  STORE_CATEGORIES,
} from '@/features/onboarding/constants';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('onboarding');
  const { enqueueSnackbar } = useSnackbar();
  const { user, refetch } = useAuth();

  const [businessType, setBusinessType] = useState('store');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('clothing');
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensuring, setEnsuring] = useState(false);
  const [merchantEnsured, setMerchantEnsured] = useState(false);

  const isPhoneValid = useMemo(() => !phone || matchIsValidTel(phone), [phone]);
  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!isPhoneValid) return false;
    if (category === 'other' && !customCategory.trim()) return false;
    return true;
  }, [name, isPhoneValid, category, customCategory]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user || user?.merchantId || merchantEnsured) return;
      try {
        setEnsuring(true);
        setError(null);
        
        // Use ensureMerchant from API
        const token = await fetch('/api/auth/me').then(r => r.ok ? r.headers.get('Authorization')?.replace('Bearer ', '') : null);
        if (!token) {
          setError(t('errors.sessionExpired'));
          return;
        }
        
        const res = await ensureMerchant(token);
        if (!mounted) return;
        if (res?.user?.merchantId) {
          // Refetch user to update AuthContext
          await refetch();
          setMerchantEnsured(true);
        } else {
          setError(t('errors.preparing'));
        }
      } catch (e: unknown) {
        const error = e as Error;
        if (!mounted) return;
        const msg = error.message || t('errors.generic');
        if (String(msg).includes('Email not verified')) {
          setError(t('errors.emailNotVerified'));
          router.push(`/${locale}/verify-email`);
        } else {
          setError(msg);
        }
      } finally {
        if (mounted) setEnsuring(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user, user?.merchantId, merchantEnsured, router, locale, t, refetch]);

  const handleContinue = async () => {
    try {
      setError(null);
      setSaving(true);

      if (!user) {
        setError(t('errors.sessionExpired'));
        return;
      }

      // Get token from API
      const token = await fetch('/api/auth/me').then(r => r.ok ? r.headers.get('Authorization')?.replace('Bearer ', '') : null);
      if (!token) {
        setError(t('errors.sessionExpired'));
        return;
      }

      let effectiveMerchantId = user?.merchantId;

      if (!effectiveMerchantId) {
        try {
          const res = await ensureMerchant(token);
          if (res?.user?.merchantId) {
            effectiveMerchantId = res.user.merchantId;
            // Refetch user to update AuthContext
            await refetch();
          }
        } catch (e: unknown) {
          const error = e as Error;
          setError(error.message || t('errors.merchantSetupFailed'));
          return;
        }
      }

      if (!effectiveMerchantId) {
        setError(t('errors.preparingRetry'));
        return;
      }

      const payload = {
        name: name.trim(),
        phone: phone || undefined,
        businessType,
        businessDescription: desc || undefined,
        categories: category !== 'other' ? [category] : undefined,
        customCategory:
          category === 'other' ? customCategory.trim() : undefined,
      };

      await saveBasicInfo(effectiveMerchantId, token, payload);
      enqueueSnackbar(t('success.basicInfoSaved'), { variant: 'success' });
      router.push(`/${locale}/onboarding/source-select`);
    } catch (e: unknown) {
      const error = e as Error;
      const errorMsg = error.message || t('errors.saveFailed');
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={1}
      total={3}
      title={
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#502E91' }}>
          {t('step1.title')}
        </Typography>
      }
      subtitle={
        <Typography variant="body1" sx={{ color: '#8589A0' }}>
          {t('step1.subtitle')}
        </Typography>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {ensuring && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('info.preparing')}
        </Alert>
      )}

      <TextField
        label={t('fields.businessName')}
        placeholder={t('placeholders.businessName')}
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        dir="rtl"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LuStore size={20} style={{ color: '#A498CB' }} />
            </InputAdornment>
          ),
        }}
      />

      <MuiTelInput
        value={phone}
        onChange={setPhone}
        defaultCountry="YE"
        onlyCountries={[
          'YE',
          'SA',
          'EG',
          'AE',
          'KW',
          'OM',
          'QA',
          'BH',
          'MA',
          'DZ',
          'TN',
          'IQ',
          'SD',
          'LY',
        ]}
        label={t('fields.phone')}
        fullWidth
        dir="ltr"
        forceCallingCode
        langOfCountryName="ar"
        sx={{ mb: 2 }}
        placeholder="0000000000"
        error={!!phone && !isPhoneValid}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="business-type-label">
          {t('fields.businessType')}
        </InputLabel>
        <Select
          labelId="business-type-label"
          label={t('fields.businessType')}
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          sx={{ textAlign: 'left' }}
        >
          {BUSINESS_TYPES.map((b) => (
            <MenuItem key={b.value} value={b.value} disabled={!b.available}>
              {b.label}
              {!b.available && (
                <span
                  style={{
                    color: '#A498CB',
                    fontSize: 13,
                    marginRight: 8,
                    fontWeight: 'bold',
                  }}
                >
                  ({t('comingSoon')})
                </span>
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="store-category-label">
          {t('fields.storeCategory')}
        </InputLabel>
        <Select
          labelId="store-category-label"
          label={t('fields.storeCategory')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ textAlign: 'left' }}
        >
          {STORE_CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {category === 'other' && (
        <TextField
          label={t('fields.customCategory')}
          placeholder={t('placeholders.customCategory')}
          fullWidth
          sx={{ mb: 2 }}
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          dir="rtl"
        />
      )}

      <TextField
        label={t('fields.businessDescription')}
        placeholder={t('placeholders.businessDescription')}
        fullWidth
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        sx={{ mb: 2 }}
        dir="rtl"
        multiline
        minRows={2}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <MdOutlineBusiness size={22} style={{ color: '#A498CB' }} />
            </InputAdornment>
          ),
        }}
      />

      <Button
        fullWidth
        variant="contained"
        onClick={handleContinue}
        disabled={!canSubmit || saving || ensuring}
        sx={{
          fontWeight: 'bold',
          py: 1.7,
          fontSize: 18,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #A498CB, #502E91)',
          boxShadow: '0 3px 10px 0 rgba(80,46,145,0.13)',
          mt: 1,
        }}
      >
        {saving || ensuring ? (
          <CircularProgress size={22} color="inherit" />
        ) : (
          t('buttons.continue')
        )}
      </Button>
    </OnboardingLayout>
  );
}

