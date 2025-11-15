// src/features/mechant/promotions/ui/PromotionsToolbar.tsx
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { PromotionStatus } from "../type";

export type PromotionStatusFilter = PromotionStatus | "all";

interface PromotionsToolbarProps {
  status: PromotionStatusFilter;
  onStatusChange: (value: PromotionStatusFilter) => void;
  onAdd: () => void;
}

const STATUS_LABELS: Record<PromotionStatusFilter, string> = {
  all: "الكل",
  active: "نشط",
  inactive: "متوقف",
  scheduled: "مجدول",
  expired: "منتهي",
};

export default function PromotionsToolbar({
  status,
  onStatusChange,
  onAdd,
}: PromotionsToolbarProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2.5 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        mb: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={800}>
            إدارة العروض الترويجية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحكم في الحملات الترويجية، جداولها الزمنية، وحدود الاستخدام.
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.5, md: 2 }}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="flex-end"
        >
          <ToggleButtonGroup
            exclusive
            size={isSmall ? "small" : "medium"}
            value={status}
            onChange={(_, next) => {
              if (!next) return;
              onStatusChange(next);
            }}
            aria-label="عامل تصفية حالة العروض"
            color="primary"
            sx={{
              backgroundColor: theme.palette.action.hover,
              borderRadius: 2,
              "& .MuiToggleButton-root": {
                border: "none",
                px: isSmall ? 1 : 2,
                "&.Mui-selected": {
                  color: theme.palette.primary.contrastText,
                  backgroundColor: theme.palette.primary.main,
                },
              },
            }}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <ToggleButton key={value} value={value}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onAdd}
          >
            عرض جديد
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

