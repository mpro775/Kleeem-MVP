import {
  Box,
  Typography,
  Avatar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ShareIcon from "@mui/icons-material/Share";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useStepsAnimation } from '@/features/landing/hooks/useStepsAnimation';
import { useRef, type RefObject } from "react";

const steps = [
  {
    title: "إنشاء حساب",
    icon: <PersonAddAltIcon sx={{ fontSize: 32 }} />,
    description:
      "سجّل مجانًا وادخل لوحة تحكم كليم الذكية خلال دقيقة واحدة فقط.",
    duration: "دقيقة واحدة",
  },
  {
    title: "تهيئة متجرك",
    icon: <StorefrontIcon sx={{ fontSize: 32 }} />,
    description:
      "اربط متجرك الإلكتروني الحالي (سلة، زد...) أو أنشئ متجرك الجديد من كليم مباشرة.",
    duration: "٥ دقائق",
  },
  {
    title: "تهيئة البوت",
    icon: <SmartToyIcon sx={{ fontSize: 32 }} />,
    description:
      "عرّف كليم على منتجاتك وتعليماتك وأسلوبك في التواصل. كليم يتعلم تلقائيًا ويجهّز نفسه للرد على عملائك.",
    duration: "١٠ دقائق",
  },
  {
    title: "ربط القنوات",
    icon: <ShareIcon sx={{ fontSize: 32 }} />,
    description:
      "فعّل كليم على قنواتك: واتساب، تيليجرام، دردشة الموقع وغيرها بنقرة واحدة… واستقبل استفسارات العملاء أينما كانوا!",
    duration: "٣ دقائق",
  },
];

// خط الربط المخصص
const ConnectorLine = styled(Box)(({ theme }) => ({
  position: "absolute",
  height: "4px",
  background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  top: "50%",
  left: "100%",
  right: "-10%",
  transform: "translateY(-50%)",
  borderRadius: "2px",
  zIndex: 1,
  "&::after": {
    content: '""',
    position: "absolute",
    right: "-8px",
    top: "50%",
    transform: "translateY(-50%)",
    width: 0,
    height: 0,
    borderLeft: `8px solid ${theme.palette.primary.dark}`,
    borderTop: "6px solid transparent",
    borderBottom: "6px solid transparent",
  },
  [theme.breakpoints.down("md")]: {
    display: "none",
  },
}));

// خط الربط العمودي للموبايل
const VerticalConnector = styled(Box)(({ theme }) => ({
  position: "absolute",
  width: "4px",
  height: "60px",
  background: `linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  left: "50%",
  bottom: "-60px",
  transform: "translateX(-50%)",
  borderRadius: "2px",
  zIndex: 1,
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: "-8px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderTop: `8px solid ${theme.palette.primary.dark}`,
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
  },
  [theme.breakpoints.up("md")]: {
    display: "none",
  },
}));

// صندوق الخطوة
const StepBox = styled(Box)(({ theme }) => ({
  position: "relative",
  background: "#fff",
  borderRadius: "20px",
  padding: theme.spacing(4),
  textAlign: "center",
  border: "2px solid transparent",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  // ضمان ظهور العناصر قبل الأنيميشن
  opacity: 1,
  transform: "translateY(0) scale(1)",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: `0 16px 48px rgba(${theme.palette.primary.dark}, 0.2)`,
    border: `2px solid ${theme.palette.primary.dark}`,
    "& .step-number": {
      background: theme.palette.primary.dark,
      color: "#fff",
      transform: "scale(1.1)",
    },
    "& .step-icon": {
      transform: "scale(1.1) rotate(5deg)",
    },
  },
  [theme.breakpoints.down("md")]: {
    marginBottom: theme.spacing(8),
  },
}));

// رقم الخطوة
const StepNumber = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "-15px",
  right: "-15px",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: `3px solid ${theme.palette.primary.dark}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: 700,
  color: theme.palette.primary.dark,
  transition: "all 0.3s ease",
  zIndex: 2,
}));

// أيقونة الخطوة
const StepIcon = styled(Avatar)(({ theme }) => ({
  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
  width: "80px",
  height: "80px",
  margin: "0 auto 20px",
  transition: "all 0.3s ease",
  "& svg": {
    color: "#fff",
  },
}));

// شارة المدة
const DurationBadge = styled(Box)(() => ({
  display: "inline-block",
  background: "linear-gradient(90deg, #E8F5E8 0%, #F0F8F0 100%)",
  color: "#2E7D32",
  padding: "6px 16px",
  borderRadius: "20px",
  fontSize: "14px",
  fontWeight: 600,
  marginTop: "12px",
  border: "1px solid #81C784",
}));

export default function HowItWorksStepsSection() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const sectionRef = useRef<HTMLElement>(null);

  // 2. استدعاء الخطاف وتمرير المرجع له
  useStepsAnimation(sectionRef as RefObject<HTMLElement>);
  return (
    <Box
    ref={sectionRef}
      id="how-it-works"
      sx={{
        p: { xs: 3, md: 6 },
        my: 6,
        maxWidth: 1400,
        mx: "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* العنوان الرئيسي */}
      <Box textAlign="center" mb={6}>
        <Typography
         className="steps-title"
          component="h2"
          variant="h3"
          fontWeight={800}
          mb={2}
          sx={{
            background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "2rem", md: "2.5rem" },
          }}
        >
          كيف يعمل كليم في ٤ خطوات سهلة؟
        </Typography>
        <Typography
         className="steps-subtitle"
          variant="h6"
          color="#666"
          fontWeight={400}
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          من التسجيل إلى بدء العمل خلال أقل من ٢٠ دقيقة
        </Typography>
      </Box>

      {/* الخطوات */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 0, md: 4 },
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          mb: 4,
        }}
      >
        {steps.map((step, idx) => (
          <Box
          className="step-box-item"
            key={idx}
            sx={{
              flex: 1,
              minWidth: { xs: "100%", md: 280 },
              maxWidth: { xs: "100%", md: 320 },
              position: "relative",
            }}
          >
            <StepBox 
              className="step-box-animated"
              sx={{
                // تحسينات للهواتف
                [theme.breakpoints.down("md")]: {
                  padding: theme.spacing(2.5),
                  marginBottom: theme.spacing(4),
                },
                [theme.breakpoints.down("sm")]: {
                  padding: theme.spacing(2),
                  marginBottom: theme.spacing(3),
                },
              }}
            >
              {/* رقم الخطوة */}
              <StepNumber className="step-number">{idx + 1}</StepNumber>

              {/* أيقونة الخطوة */}
              <StepIcon className="step-icon" variant="circular">
                {step.icon}
              </StepIcon>

              {/* عنوان الخطوة */}
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  color: theme.palette.primary.dark,
                  mb: 2,
                  fontSize: { xs: "1.3rem", md: "1.5rem" },
                }}
              >
                {step.title}
              </Typography>

              {/* وصف الخطوة */}
              <Typography
                variant="body1"
                color="#555"
                sx={{
                  lineHeight: 1.7,
                  fontSize: "1rem",
                  mb: 2,
                }}
              >
                {step.description}
              </Typography>

              {/* شارة المدة */}
              <DurationBadge>
                <CheckCircleIcon
                  sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }}
                />
                {step.duration}
              </DurationBadge>

             {/* سنضيف className لخطوط الربط */}
             {!isMobile && idx < steps.length - 1 && <ConnectorLine className="connector-line" />}
              {isMobile && idx < steps.length - 1 && <VerticalConnector className="connector-line" />}
            </StepBox>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
