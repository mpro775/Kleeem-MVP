// src/app/GlobalGradients.tsx
import { useTheme } from "@mui/material/styles";

export default function GlobalGradients() {
  const theme = useTheme();
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <linearGradient id="my-gradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={theme.palette.primary.dark} />
        <stop offset="100%" stopColor={theme.palette.primary.main} />
      </linearGradient>
    </svg>
  );
}
