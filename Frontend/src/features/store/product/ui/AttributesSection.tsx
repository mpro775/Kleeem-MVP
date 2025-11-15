import { Box, Chip, Typography } from "@mui/material";
import { useMemo } from "react";

export default function AttributesSection({
  attributes,
  selected,
  onSelect,
}: {
  attributes?: Record<string, string[]>;
  selected: Record<string, string>;
  onSelect: (key: string, val: string) => void;
}) {
  const entries = useMemo(() => Object.entries(attributes ?? {}), [attributes]);

  if (!entries.length) return null;

  return (
    <Box sx={{ mb: 3 }}>
      {entries.map(([key, values]) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Typography fontWeight="bold" sx={{ mb: 1 }}>
            {key}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {(values as string[]).map((val) => {
              const isSelected = selected[key] === val;
              return (
                <Chip
                  key={val}
                  label={val}
                  clickable
                  onClick={() => onSelect(key, val)}
                  variant={isSelected ? "filled" : "outlined"}
                  sx={{
                    ...(isSelected
                      ? {
                          bgcolor: "var(--brand)",
                          color: "var(--on-brand)",
                          borderColor: "transparent",
                        }
                      : {}),
                    fontWeight: "bold",
                  }}
                />
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
