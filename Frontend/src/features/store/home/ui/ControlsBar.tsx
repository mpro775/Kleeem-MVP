// =========================
// File: src/features/store/ui/ControlsBar.tsx
// =========================
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";

export function ControlsBar({
  search,
  onSearch,
  showOffersOnly,
  onToggleOffers,
  offersCount,
  offersLoading,
  onOpenMobileFilters,
}: {
  search: string;
  onSearch: (v: string) => void;
  showOffersOnly: boolean;
  onToggleOffers: () => void;
  offersCount: number;
  offersLoading: boolean;
  onOpenMobileFilters: () => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 4,
        gap: 2,
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <TextField
        label="ابحث عن منتج"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        fullWidth
        sx={{
          maxWidth: isMobile ? "100%" : 500,
          "& .MuiOutlinedInput-root": {
            borderRadius: 50,
            backgroundColor: "white",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            "&:hover": { boxShadow: "0 2px 15px rgba(0,0,0,0.1)" },
          },
        }}
        InputProps={{
          startAdornment: (
            <SearchIcon sx={{ color: "action.active", mr: 1 }} />
          ) as React.ReactNode,
        }}
      />
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          icon={<LocalOfferIcon />}
          color={showOffersOnly ? "primary" : "default"}
          label={
            showOffersOnly
              ? "عرض جميع المنتجات"
              : `العروض ${
                  offersLoading ? "…" : offersCount ? `(${offersCount})` : ""
                }`
          }
          onClick={onToggleOffers}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        />
        {isMobile && (
          <IconButton
            sx={{
              backgroundColor: "var(--brand)",
              color: "var(--on-brand)",
              borderRadius: 2,
              p: 1.5,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              "&:hover": { backgroundColor: "var(--brand-hover)" },
            }}
            onClick={onOpenMobileFilters}
          >
            <FilterListIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              التصنيفات
            </Typography>
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}
