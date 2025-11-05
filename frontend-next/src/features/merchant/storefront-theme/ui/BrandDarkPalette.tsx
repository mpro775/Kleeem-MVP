'use client';

import { Box, Typography, ButtonBase, Tooltip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { ALLOWED_BRAND_DARK } from "@/features/shared/allowedBrandPalette";

export function BrandDarkPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Box>
      <Typography fontWeight="bold" mb={1}>
        اللون الداكن (واحد فقط)
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1.5}>
        {ALLOWED_BRAND_DARK.map((opt) => {
          const selected = value.toUpperCase() === opt.hex.toUpperCase();
          return (
            <Tooltip key={opt.hex} title={opt.label}>
              <ButtonBase
                onClick={() => onChange(opt.hex)}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: selected
                    ? "3px solid #fff"
                    : "2px solid rgba(255,255,255,0.5)",
                  boxShadow: selected ? `0 0 0 2px ${opt.hex}` : "none",
                  background: opt.hex,
                  position: "relative",
                }}
                aria-label={`اختر ${opt.label}`}
              >
                {selected && (
                  <CheckIcon
                    sx={{
                      color: "#fff",
                      position: "absolute",
                      fontSize: 22,
                    }}
                  />
                )}
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Box>
      <Typography variant="body2" color="text.secondary" mt={1.5}>
        يُطبّق هذا اللون على النافبار، الفوتر، والأزرار الأساسية، مع نص أبيض
        دائمًا.
      </Typography>
    </Box>
  );
}
