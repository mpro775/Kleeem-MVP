// src/features/mechant/analytics/components/KpiCard.tsx
import { Paper, Typography } from "@mui/material";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export const KpiCard = ({ title, value, subtitle }: KpiCardProps) => (
  <Paper
    elevation={0}
    sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}
  >
    <Typography variant="caption" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
      {value}
    </Typography>
    {subtitle && (
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Paper>
);