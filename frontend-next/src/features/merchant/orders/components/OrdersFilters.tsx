'use client';

/**
 * OrdersFilters Component
 * @description Filters for orders list
 */

import {
  Paper,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslations } from 'next-intl';
import type { OrderStatus } from '../types';
import { STATUS_LABEL } from './constants';

interface OrdersFiltersProps {
  phone: string;
  status: string;
  onPhoneChange: (phone: string) => void;
  onStatusChange: (status: string) => void;
  onClear: () => void;
}

export function OrdersFilters({
  phone,
  status,
  onPhoneChange,
  onStatusChange,
  onClear,
}: OrdersFiltersProps) {
  const t = useTranslations('orders');

  const hasFilters = phone || status;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        {/* Search by Phone */}
        <TextField
          size="small"
          placeholder={t('filters.searchByPhone')}
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />

        {/* Filter by Status */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('filters.status')}</InputLabel>
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            label={t('filters.status')}
            startAdornment={
              <InputAdornment position="start">
                <FilterListIcon />
              </InputAdornment>
            }
          >
            <MenuItem value="">
              <em>{t('filters.all')}</em>
            </MenuItem>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear Filters Button */}
        {hasFilters && (
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={onClear}
            sx={{ minWidth: 120 }}
          >
            {t('filters.clear')}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

