'use client';

// src/features/storefront-theme/ui/ButtonStyleSelect.tsx
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import type { ButtonStyle } from '../types';

type Props = {
  value: ButtonStyle;
  onChange: (v: ButtonStyle) => void;
};

export function ButtonStyleSelect({ value, onChange }: Props) {
  return (
    <Box minWidth={220}>
      <Typography fontWeight="bold" mb={2}>
        أسلوب الأزرار:
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="btn-style-label">أسلوب الأزرار</InputLabel>
        <Select
          labelId="btn-style-label"
          value={value}
          label="أسلوب الأزرار"
          onChange={(e) => onChange(e.target.value as ButtonStyle)}
        >
          <MenuItem value="rounded">دائري الزوايا (مستدير)</MenuItem>
          <MenuItem value="square">مربع الزوايا (مستطيل)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
