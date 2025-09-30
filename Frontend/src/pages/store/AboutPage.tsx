// src/pages/store/about/AboutPage.tsx
import {
  Box,
  Container,
  Grid,
  IconButton,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PolicyIcon from "@mui/icons-material/Policy";
import ScheduleIcon from "@mui/icons-material/Schedule";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useParams, useNavigate } from "react-router-dom";

import AboutHero from "@/features/store/about/ui/AboutHero";
import ContactCard from "@/features/store/about/ui/ContactCard";
import HoursCard from "@/features/store/about/ui/HoursCard";
import PoliciesSection from "@/features/store/about/ui/PoliciesSection";
import AboutSkeleton from "@/features/store/about/ui/AboutSkeleton";
import { StoreNavbar } from "@/features/store/ui/StoreNavbar";
import { Footer } from "@/features/store/ui/Footer";
import { useStoreData } from "@/features/store/home/hooks/useStoreData";
import { useErrorHandler } from "@/shared/errors";
import type { Storefront } from "@/features/mechant/storefront-theme/type";

export default function AboutPage() {
  const { slug } = useParams<{ slug: string }>();

  const { handleError } = useErrorHandler();

  const navigate = useNavigate();
  const isDemo =
    slug === "demo" || new URLSearchParams(location.search).has("demo");
  // اجلب storefront وثبّت ألوان البراند (hook يُستدعى دائمًا)
  const {
    merchant,
    storefront,

    isLoading,
    error,
  } = useStoreData(slug, isDemo, handleError);
  if (isLoading) return <AboutSkeleton />;

  if (error || !merchant) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "70vh",
          textAlign: "center",
          px: 2,
        }}
      >
        <Typography variant="h5" color="error">
          {error || "تعذر تحميل معلومات المتجر"}
        </Typography>
      </Box>
    );
  }

  const city = merchant.addresses?.[0]?.city;
  const phone = merchant.phone;
  const hasPolicies =
    merchant.returnPolicy || merchant.exchangePolicy || merchant.shippingPolicy;

  // Add missing categories property for StoreNavbar compatibility
  const merchantWithCategories = {
    ...merchant,
    categories: [],
  };

  const chipBase = {
    backgroundColor: "var(--brand)",
    borderColor: "var(--brand)",
    color: "var(--on-brand)",
  };

  return (
    <Box sx={{ bgcolor: "#fff" }}>
      <StoreNavbar
        merchant={merchantWithCategories}
        storefront={storefront as Storefront} // ← صار فعلي
      />
      {/* هيرو أنيق بخلفية متدرجة وفق ألوان البراند */}
      <Box
        sx={{
          position: "relative",
          color: "var(--on-brand)",
          background: "var(--brand)",
          boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        {/* فقاعات ضوء ناعمة */}
        <Box
          sx={{
            position: "absolute",
            inset: -80,
            background: "var(--brand)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            right: "-10%",
            bottom: "-20%",
            width: 520,
            height: 520,
            borderRadius: "50%",
            filter: "blur(60px)",
            background: "var(--brand) !important",
            pointerEvents: "none",
          }}
        />

        <Container
          maxWidth="lg"
          sx={{ py: { xs: 4, md: 6 }, position: "relative", zIndex: 1 }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Tooltip title="العودة">
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  color: "var(--on-brand)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
                }}
              >
                <ArrowBack />
              </IconButton>
            </Tooltip>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              من نحن
            </Typography>
          </Stack>

          {/* Hero Content (يستخدم AboutHero لديك) */}
          <AboutHero merchant={merchant} />

          {/* شِيبس معلومات سريعة تحت الهيرو */}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 2 }}
          >
            {phone && (
              <Chip
                icon={<PhoneIcon />}
                label={phone}
                component="a"
                href={`tel:${phone}`}
                clickable
                sx={{
                  ...chipBase,
                  color: "var(--on-brand)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: "rgba(255,255,255,0.14)",
                }}
              />
            )}
            {city && (
              <Chip
                icon={<LocationOnIcon />}
                label={city}
                sx={{
                  ...chipBase,
                  color: "var(--on-brand)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: "rgba(255,255,255,0.14)",
                }}
              />
            )}
            {merchant.workingHours?.length &&
              merchant.workingHours?.length > 0 && (
                <Chip
                  icon={<ScheduleIcon />}
                  label={`${merchant.workingHours[0].day} ${merchant.workingHours[0].openTime}–${merchant.workingHours[0].closeTime}`}
                  sx={{
                    ...chipBase,
                    color: "var(--on-brand)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    background: "rgba(255,255,255,0.14)",
                  }}
                />
              )}
            {hasPolicies && (
              <Chip
                icon={<PolicyIcon />}
                label="سياسات المتجر"
                sx={{
                  ...chipBase,
                  color: "var(--on-brand)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: "rgba(255,255,255,0.14)",
                }}
              />
            )}
          </Stack>
        </Container>
      </Box>

      {/* المحتوى الأبيض أسفل الهيرو */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ContactCard merchant={merchant} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <HoursCard merchant={merchant} />
          </Grid>
        </Grid>

        {hasPolicies && (
          <>
            <Divider sx={{ my: 5 }} />
            <PoliciesSection merchant={merchant} />
          </>
        )}

        {/* CTA في الأسفل */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mt: 5, justifyContent: "center" }}
        >
          {phone && (
            <Button
              variant="contained"
              size="large"
              startIcon={<PhoneIcon />}
              href={`tel:${phone}`}
              sx={{
                px: 4,
                py: 1.25,
                fontWeight: "bold",
                background: "var(--brand)",
                color: "var(--on-brand)",
                "&:hover": { background: "var(--brand-hover)" },
              }}
            >
              اتصل بنا
            </Button>
          )}

          <Button
            variant="outlined"
            size="large"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate(`/store/${slug}`)}
            sx={{
              px: 4,
              py: 1.25,
              color: "var(--on-brand)",
              background: "var(--brand)",
              fontWeight: "bold",
              borderColor: "rgba(0,0,0,0.2)",
              "&:hover": {
                borderColor: "rgba(0,0,0,0.35)",
                background: "rgba(0,0,0,0.02)",
              },
            }}
          >
            تصفح منتجاتنا
          </Button>
        </Stack>
      </Container>
      <Footer merchant={merchantWithCategories} categories={[]} />
    </Box>
  );
}
