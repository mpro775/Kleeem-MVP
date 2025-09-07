// src/features/mechant/storefront-theme/ui/BrandSwatches.tsx
import { Box, Tooltip } from "@mui/material";
import { BRANDS } from "@/features/shared/brandPalette";

type Props = {
  value: string;
  onChange: (hex: string) => void;
  allowed?: string[]; // مفاتيح BRANDS أو هكسات
};

export function BrandSwatches({ value, onChange, allowed }: Props) {
  const entries = Object.entries(BRANDS).filter(([_, b]) =>
    allowed?.length ? allowed.map((h) => h.toLowerCase()).includes(b.hex.toLowerCase()) : true
  );

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
      {entries.map(([key, b]) => {
        const active = value?.toLowerCase() === b.hex.toLowerCase();
        return (
          <Tooltip key={key} title={b.name}>
            <Box
              onClick={() => onChange(b.hex)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: b.hex,
                cursor: "pointer",
                outline: active ? "3px solid #fff" : "none",
                boxShadow: active ? `0 0 0 3px ${b.hex}` : "0 0 0 1px rgba(0,0,0,.1)",
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}
