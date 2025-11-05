'use client';

import { Box, IconButton, TextField, Typography } from "@mui/material";

export default function QuantityPicker({
  value,
  onChange,
  max = 999,
}: {
  value: number;
  onChange: (val: number) => void;
  max?: number;
}) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography fontWeight="bold" sx={{ mb: 2 }}>
        الكمية
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <IconButton
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
        >
          -
        </IconButton>
        <TextField
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v > 0) onChange(Math.min(max, v));
          }}
          inputProps={{ min: 1, max }}
          sx={{ width: 80, textAlign: "center" }}
        />
        <IconButton
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          +
        </IconButton>
      </Box>
    </Box>
  );
}
