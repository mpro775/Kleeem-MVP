// src/features/mechant/analytics/components/AnalyticsFilters.tsx
import { Paper, Stack, Typography, Chip, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { Period, Channel } from "../api";

interface AnalyticsFiltersProps {
  period: Period;
  channel: Channel;
  onFilterChange: (period: Period, channel: Channel) => void;
}

const periodLabel = (p: Period) =>
  p === "week" ? "آخر أسبوع" : p === "month" ? "آخر شهر" : "آخر ربع";

export const AnalyticsFilters = ({ period, channel, onFilterChange }: AnalyticsFiltersProps) => {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6" fontWeight={800}>الإحصائيات</Typography>
        <Chip size="small" label={periodLabel(period)} />
      </Stack>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الفترة</InputLabel>
          <Select value={period} label="الفترة" onChange={(e) => onFilterChange(e.target.value as Period, channel)}>
            <MenuItem value="week">أسبوع</MenuItem>
            <MenuItem value="month">شهر</MenuItem>
            <MenuItem value="quarter">ربع</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>القناة</InputLabel>
          <Select value={channel} label="القناة" onChange={(e) => onFilterChange(period, e.target.value as Channel)}>
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="whatsapp">WhatsApp</MenuItem>
            <MenuItem value="telegram">Telegram</MenuItem>
            <MenuItem value="webchat">Web Chat</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Paper>
  );
};