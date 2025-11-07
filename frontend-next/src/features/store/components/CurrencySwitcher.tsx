'use client';

import { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import axiosInstance from '@/lib/axios';

interface CurrencySwitcherProps {
  merchantId: string;
  onChange?: (currency: string) => void;
}

export function CurrencySwitcher({
  merchantId,
  onChange,
}: CurrencySwitcherProps) {
  const [currencies, setCurrencies] = useState<string[]>(['SAR']);
  const [selected, setSelected] = useState('SAR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrencies();
    loadSavedCurrency();
  }, [merchantId]);

  const loadCurrencies = async () => {
    try {
      const response = await axiosInstance.get(`/merchants/${merchantId}`);
      const supported =
        response.data.currencySettings?.supportedCurrencies || ['SAR'];
      setCurrencies(supported);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedCurrency = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`currency_${merchantId}`);
      if (saved) {
        setSelected(saved);
        onChange?.(saved);
      }
    }
  };

  const handleChange = (currency: string) => {
    setSelected(currency);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`currency_${merchantId}`, currency);
    }
    onChange?.(currency);
    // يمكن إعادة تحميل الصفحة أو تحديث الأسعار ديناميكياً
    // window.location.reload(); // optional
  };

  if (loading || currencies.length <= 1) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <InputLabel>العملة</InputLabel>
      <Select
        value={selected}
        label="العملة"
        onChange={(e) => handleChange(e.target.value)}
      >
        {currencies.map((currency) => (
          <MenuItem key={currency} value={currency}>
            {currency}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

