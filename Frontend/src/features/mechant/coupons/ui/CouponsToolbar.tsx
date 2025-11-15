// src/features/mechant/coupons/ui/CouponsToolbar.tsx
import {
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import QrCodeIcon from "@mui/icons-material/QrCode";
import type { CouponStatus } from "../type";

export type CouponStatusFilter = CouponStatus | "all";

interface CouponsToolbarProps {
  search: string;
  status: CouponStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: CouponStatusFilter) => void;
  onAdd: () => void;
  onGenerateCodes?: () => void;
  generatingCodes?: boolean;
}

const STATUS_LABELS: Record<CouponStatusFilter, string> = {
  all: "الكل",
  active: "نشط",
  inactive: "متوقف",
  expired: "منتهي",
};

export default function CouponsToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onAdd,
  onGenerateCodes,
  generatingCodes = false,
}: CouponsToolbarProps) {
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
            إدارة الكوبونات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحكم في أكواد الخصم، حالة التفعيل، وحدود الاستخدام بسهولة.
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
            aria-label="عامل تصفية حالة الكوبون"
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

          <TextField
            size={isSmall ? "small" : "medium"}
            label="بحث بالكود أو الوصف"
            variant="outlined"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            sx={{ minWidth: { xs: "100%", md: 240 } }}
            inputProps={{ dir: "ltr" }}
          />

          <Stack direction="row" spacing={1}>
            {onGenerateCodes ? (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<QrCodeIcon />}
                onClick={onGenerateCodes}
                disabled={generatingCodes}
              >
                توليد أكواد
              </Button>
            ) : null}
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={onAdd}
            >
              كوبون جديد
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

