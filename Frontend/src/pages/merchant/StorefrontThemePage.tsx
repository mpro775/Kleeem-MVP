// src/features/storefront-theme/StorefrontThemePage.tsx
import {
  Box,
  Paper,
  Typography,
  Button,
  Snackbar,
  Alert,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { ButtonStyleSelect } from "@/features/mechant/storefront-theme/ui/ButtonStyleSelect";
import { SlugLinkField } from "@/features/mechant/storefront-theme/ui/SlugLinkField";
import { BrandSwatches } from "@/features/mechant/storefront-theme/ui/BrandSwatches";
import { useStorefrontTheme } from "@/features/mechant/storefront-theme/hooks";
import { findBrandByHex } from "@/features/shared/brandPalette";

export default function StorefrontThemePage() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";

  const {
    loading,
    saveLoading,
    snackbar,
    closeSnackbar,
    brandDark,
    setBrandDark,
    buttonStyle,
    setButtonStyle,
    publicSlug,
    domain,
    storeUrl,
    handleSave,
  } = useStorefrontTheme(merchantId);

  // CSS Vars للمعاينة الحية
  const picked = findBrandByHex(brandDark);
  const brand = picked?.hex ?? "#111827";
  const onBrand = "#ffffff";
  const brandHover = picked?.hover ?? "#0b1220";

  if (loading) {
    return (
      <Box sx={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>جاري التحميل…</Typography>
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        // فل-سكرين مريح
        px: { xs: 1.5, md: 3 },
        py: { xs: 2, md: 4 },
        minHeight: "100vh",
        bgcolor: "#fafafa",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          mx: "auto",
          width: "100%",
          maxWidth: "1400px",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, md: 4 },
          // نمرر متغيرات اللون للمعاينة السفلية
          "--brand": brand,
          "--on-brand": onBrand,
          "--brand-hover": brandHover,
        }}
      >
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
          إعدادات مظهر المتجر ورابط الوصول
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          اختر لونًا داكنًا واحدًا للنافبار والفوتر والأزرار — والباقي أبيض.
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 4 }}
        >
          <Box sx={{ minWidth: 280 }}>
            <Typography sx={{ mb: 1, fontWeight: "bold" }}>
              اللون المعتمد
            </Typography>
            <BrandSwatches value={brandDark} onChange={setBrandDark} />
          </Box>

          <ButtonStyleSelect value={buttonStyle} onChange={setButtonStyle} />
        </Stack>

        {/* معاينة سريعة */}
        <Box
          sx={{
            mb: 4,
            border: "1px solid #e5e7eb",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              background: "var(--brand)",
              color: "var(--on-brand)",
              p: 2,
            }}
          >
            <Typography fontWeight={700}>Navbar Preview</Typography>
          </Box>

          <Box sx={{ p: 3, bgcolor: "#fff" }}>
            <Typography sx={{ mb: 2 }}>
              المحتوى هنا خلفيته بيضاء دومًا.
            </Typography>
            <Button
              variant="contained"
              sx={{
                background: "var(--brand) !important",
                color: "var(--on-brand)",
                borderRadius: buttonStyle === "rounded" ? 8 : 1,
                px: 4,
                "&:hover": { background: "var(--brand-hover)" },
              }}
            >
              زر أساسي (Primary)
            </Button>
          </Box>

          <Box
            sx={{
              background: "var(--brand)",
              color: "var(--on-brand)",
              p: 2,
            }}
          >
            <Typography>Footer Preview</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <SlugLinkField
          slug={publicSlug}
          storeUrl={storeUrl}
          domain={domain}
          readOnly
        />

        {/* CTA — ثابت أسفل الشاشة على الموبايل لسهولة الوصول */}
        <Box
          sx={{
            mt: 2,
            position: { xs: "sticky", md: "static" },
            bottom: { xs: 12, md: "auto" },
            zIndex: 2,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saveLoading}
            sx={{
              background: "var(--brand)",
              color: "var(--on-brand)",
              borderRadius: buttonStyle === "rounded" ? 8 : 1,
              px: 6,
              fontWeight: "bold",
              "&:hover": { background: "var(--brand-hover)" },
              boxShadow: isSm ? 3 : 1,
            }}
          >
            {saveLoading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
