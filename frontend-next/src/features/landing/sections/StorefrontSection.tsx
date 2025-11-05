'use client';

// src/components/landing/StorefrontSection.tsx
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import { useStorefrontAnimation } from '@/features/landing/hooks/useStorefrontAnimation';
import { useRef, type RefObject } from "react";

// ========= تصميم القسم الأساسي بخلفية متدرجة وإضاءات =========
const Section = styled(Box)(({ theme }) => ({
  position: "relative",
  paddingTop: theme.spacing(12),
  paddingBottom: theme.spacing(12),
  overflow: "hidden",
  background:
    theme.palette.mode === "dark"
      ? "radial-gradient(1200px 800px at 80% -10%, rgba(255,133,0,0.14), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.02), transparent)"
      : "radial-gradient(1200px 800px at 80% -10%, rgba(255,133,0,0.12), transparent 50%), linear-gradient(180deg, #fff, #f8fafc)",
  // زخرفة خفيفة
  "&::before": {
    content: '""',
    position: "absolute",
    inset: -2,
    background:
      "conic-gradient(from 180deg at 50% 50%, rgba(255,133,0,0.05), rgba(37,117,252,0.05), rgba(255,133,0,0.05))",
    filter: "blur(60px)",
    opacity: 0.5,
    pointerEvents: "none",
  },
}));

// ========= كرت زجاجي عام =========
const GlassCard = styled(Box)(({ theme }) => ({
  backdropFilter: "blur(10px)",
  background:
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.7)",
  border: `1px solid ${
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.06)"
  }`,
  borderRadius: 16,
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 10px 30px rgba(0,0,0,0.35)"
      : "0 20px 40px rgba(2,6,23,0.06)",
  transition: "transform .25s ease, box-shadow .25s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 18px 40px rgba(0,0,0,0.45)"
        : "0 30px 60px rgba(2,6,23,0.08)",
  },
}));

// ========= “حبّات” ميزات صغيرة =========
const Pill = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  lineHeight: 1,
  border: `1px solid ${theme.palette.divider}`,
  background:
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.03)"
      : "rgba(255,255,255,0.9)",
}));

// ========= قائمة الميزات التفصيلية =========
type FeatureItem = { icon: React.ElementType; text: string };
const featureDetails: FeatureItem[] = [
  { icon: ShoppingCartRoundedIcon, text: "سلة شراء وخطوات طلب مبسّطة" },
  { icon: LinkRoundedIcon, text: "رابط فوري *.kleem.store أو نطاقك المخصص" },
  {
    icon: ColorLensRoundedIcon,
    text: "هوية بصرية: شعار + ألوان + شكل الأزرار",
  },
  {
    icon: ChatRoundedIcon,
    text: "دردشة  مدمجة للشراء عبر المحادثة",
  },
  { icon: ShieldRoundedIcon, text: "سياسات شحن/استبدال + صلاحيات آمنة" },
  {
    icon: SupportAgentRoundedIcon,
    text: "أسئلة شائعة وساعات عمل وروابط تواصل",
  },
];

// ========= معاينة متجر (Mock) قابلة للاستبدال بصورة =========
function StorefrontPreview() {
  return (
    <GlassCard
      className="storefront-preview" // <-- إضافة className

    sx={{
        flex: "1 1 360px",
        minWidth: 0,
        p: 3,
        position: "relative",
      }}
    >
      <Chip
        label="معاينة المتجر"
        size="small"
        sx={{ position: "absolute", top: 12, left: 12, opacity: 0.9 }}
      />
      <Box
        className="storefront-preview-image" // <-- إضافة className

        sx={{
          borderRadius: 14,
          overflow: "hidden",
          border: (t) => `1px solid ${t.palette.divider}`,
          // مساحة المعاينة (استبدل الخلفية بصورة حقيقية للمتجر)
          aspectRatio: "16 / 10",
          background:
            "linear-gradient(135deg, rgba(255,133,0,0.18), rgba(37,117,252,0.18))",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
          ضع هنا Screenshot لواجهة متجرك
        </Typography>
      </Box>

      {/* شريط “المزايا السريعة” أسفل المعاينة */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          mt: 2.5,
          justifyContent: "flex-start",
        }}
      >
        <Pill>
          <RocketLaunchRoundedIcon fontSize="small" />
          جاهز خلال دقائق
        </Pill>
        <Pill>
          <ShoppingCartRoundedIcon fontSize="small" />
          سلة مبسّطة
        </Pill>
        <Pill>
          <ChatRoundedIcon fontSize="small" />
          محادثات مدمجة
        </Pill>
        <Pill>
          <LinkRoundedIcon fontSize="small" />
          نطاق مخصص
        </Pill>
      </Box>
    </GlassCard>
  );
}

export default function StorefrontSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useStorefrontAnimation(sectionRef as RefObject<HTMLElement>);
  return (
    <Section ref={sectionRef} id="storefront" dir="rtl">
      <Container maxWidth="lg" sx={{ px: 2 }}>
        {/* الرأس */}
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Chip label="ميزة أساسية" />
          <Typography
                      className="storefront-title" // <-- إضافة className

            variant="h3"
            sx={{ mt: 1.5, mb: 1, fontWeight: 800, letterSpacing: 0 }}
          >
            متجر كليم المصغّر
          </Typography>
          <Typography
            variant="subtitle1"
            className="storefront-subtitle" // <-- إضافة className

            color="text.secondary"
            sx={{ maxWidth: 900, mx: "auto" }}
          >
            لو ما عندك متجر في سلة أو زد—كليم يوفّر لك متجر جاهز خلال دقائق: أضف
            منتجاتك وحدّد الألوان والشعار، وابدأ البيع فورًا عبر رابطك الخاص.
          </Typography>

          {/* أزرار CTA */}
          <Box
            sx={{
              display: "inline-flex",
              gap: 1.5,
              mt: 3,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<RocketLaunchRoundedIcon />}
              onClick={() =>
                document
                  .getElementById("cta")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              أنشئ متجرك الآن
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<PlayCircleOutlineRoundedIcon />}
              href="/signup"
            >
              شاهد مثال مباشر
            </Button>
          </Box>
        </Box>

        {/* صف علوي: كرت تعريفي + معاينة */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2.5,
            alignItems: "stretch",
            mb: 3,
          }}
        >
          {/* كرت تعريفي غني */}
          <GlassCard
            className="storefront-main-card" // 
            sx={{
              flex: "1 1 360px",
              minWidth: 0,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              لماذا المتجر ؟
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.9 }}>
              مناسب للبدايات السريعة والبيع عبر المحادثات .
              ولو احتجت لاحقًا مزايا أوسع تقدر تنتقل
              لسلة/زد وتستمر تستخدم كليم بالتكامل.
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* شارات مختصرة */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Pill>
                <ColorLensRoundedIcon fontSize="small" />
                ألوان وشعار
              </Pill>
              <Pill>
                <ShoppingCartRoundedIcon fontSize="small" />
                سلة مبسّطة
              </Pill>
              <Pill>
                <LinkRoundedIcon fontSize="small" />
                رابط فوري
              </Pill>
           
            </Box>

            {/* قائمة ميزات تفصيلية */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {featureDetails.map(({ icon: IconCmp, text }) => (
                <Box
                className="feature-detail-item" // <-- إضافة className

                  key={text}
                  sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                >
                  <CheckCircleRoundedIcon
                    sx={{ color: "success.main", fontSize: 22 }}
                  />
                  <IconCmp sx={{ opacity: 0.85, fontSize: 20 }} />
                  <Typography variant="body1">{text}</Typography>
                </Box>
              ))}
            </Box>
          </GlassCard>
          <Box className="storefront-main-card" sx={{ flex: "1 1 360px", minWidth: 0 }}>

          {/* معاينة متجر */}
          <StorefrontPreview />
          </Box>

        </Box>

        {/* كرت “كيف يعمل؟” بعرض كامل */}
        <GlassCard
                  className="storefront-how-it-works" // <-- إضافة className

          sx={{
            p: { xs: 3, md: 4 },
            mt: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            كيف يعمل؟
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.9 }}>
            1) فعّل المتجر من لوحة التحكم. <br />
            2) أضف المنتجات (اسم، صور، سعر، مخزون). <br />
            3) اختر الهوية (ألوان/شعار، أزرار مستديرة/مربعة). <br />
            4) أدخل سياساتك وساعات العمل والأسئلة الشائعة. <br />
            5) احصل على رابطك الفوري أو اربطه بنطاقك.
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Tooltip title="الانتقال لزر التسجيل/التجربة">
              <Button
                variant="contained"
                size="large"
                onClick={() =>
                  document
                    .getElementById("cta")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                startIcon={<RocketLaunchRoundedIcon />}
              >
                ابدأ الآن
              </Button>
            </Tooltip>
            <Tooltip title="فتح الديمو في تبويب جديد">
              <Button
                variant="outlined"
                size="large"
                href="/store/demo"
                startIcon={<PlayCircleOutlineRoundedIcon />}
              >
                استعرض الديمو
              </Button>
            </Tooltip>
          </Box>
        </GlassCard>
      </Container>
    </Section>
  );
}
