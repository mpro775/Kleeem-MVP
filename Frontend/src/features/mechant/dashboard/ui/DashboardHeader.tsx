import { Box, Typography, Tabs, Tab, Tooltip, IconButton, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

type TimeRangeType = 'week' | 'month' | 'quarter';

interface DashboardHeaderProps {
  timeRange: TimeRangeType;
  setTimeRange: (value: TimeRangeType) => void;
  onRefresh: () => void;
}

export default function DashboardHeader({
  timeRange,
  setTimeRange,
  onRefresh,
}: DashboardHeaderProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        mb: 4,
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.primary.dark }}>
          لوحة التحليلات
        </Typography>
        <Typography variant="body1" color="text.secondary">
          نظرة شاملة على أداء متجرك (بيانات حقيقية)
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Tabs
          value={timeRange}
          onChange={(_e, value) => setTimeRange(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: theme.palette.primary.main,
              height: 4,
            },
          }}
        >
          <Tab label="أسبوع" value="week" sx={{ minHeight: "auto" }} />
          <Tab label="شهر" value="month" sx={{ minHeight: "auto" }} />
          <Tab label="ربع سنة" value="quarter" sx={{ minHeight: "auto" }} />
        </Tabs>
        <Tooltip title="تحديث البيانات">
          <IconButton
            onClick={onRefresh}
            sx={{
              background: theme.palette.primary.main,
              color: "white",
              "&:hover": { background: theme.palette.primary.dark },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
