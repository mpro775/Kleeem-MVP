// src/features/storefront-theme/ui/ColorPickerField.tsx
import { Box, Typography } from "@mui/material";
import { SketchPicker, type ColorResult } from "react-color";

type Props = {
  label: string;
  color: string;
  onChange: (hex: string) => void;
  presetColors?: string[];
};

export function ColorPickerField({ label, color, onChange, presetColors }: Props) {
  const handle = (c: ColorResult) => onChange(c.hex);
  return (
    <Box>
      <Typography fontWeight="bold" mb={2}>
        {label}:
      </Typography>
      <SketchPicker
        color={color}
        onChangeComplete={handle}
        presetColors={presetColors}
        styles={{ default: { picker: { boxShadow: "0 2px 16px rgba(0,0,0,0.07)" } } }}
      />
    </Box>
  );
}
