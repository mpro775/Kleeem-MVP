// src/features/store/ui/StoreHeader.tsx
import { useMemo, type JSX } from "react";
import {
  Box,
  Typography,
  Chip,
  Rating,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import ScheduleIcon from "@mui/icons-material/Schedule";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import YouTubeIcon from "@mui/icons-material/YouTube";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";
import type { Storefront } from "@/features/mechant/storefront-theme/type";

/** احسب حالة "مفتوح الآن" حسب اليوم والوقت المحلي للمتصفح */
function getOpenNow(workingHours: MerchantInfo["workingHours"]) {
  if (!workingHours || workingHours.length === 0) {
    console.log('Debug - No working hours data');
    return { isOpen: false, label: "غير محدد" };
  }
  
  // التحقق من صحة البيانات
  const validWorkingHours = workingHours.filter(w => w.day && w.openTime && w.closeTime);
  if (validWorkingHours.length === 0) {
    console.log('Debug - No valid working hours data');
    return { isOpen: false, label: "بيانات ساعات العمل غير صحيحة" };
  }
  
  const now = new Date();
  
  // الحصول على اليوم باللغة الإنجليزية (للمقارنة مع البيانات)
  const weekdayEn = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // الحصول على اليوم باللغة العربية (للعرض)
  const weekdayAr = now.toLocaleDateString('ar-SA', { weekday: 'long' });
  
  // البحث عن اليوم في البيانات
  const today = validWorkingHours.find((w) => {
    if (!w.day) return false;
    const dayLower = w.day.toLowerCase();
    
    // مقارنة مباشرة مع اللغة الإنجليزية
    if (dayLower === weekdayEn) return true;
    
    // مقارنة مع اللغة العربية
    if (dayLower === weekdayAr.toLowerCase()) return true;
    
    // مقارنة مع أسماء الأيام العربية الشائعة
    const arabicToEnglish: Record<string, string> = {
      'الاثنين': 'monday',
      'الثلاثاء': 'tuesday',
      'الأربعاء': 'wednesday',
      'الخميس': 'thursday',
      'الجمعة': 'friday',
      'السبت': 'saturday',
      'الأحد': 'sunday'
    };
    
    const englishDay = arabicToEnglish[dayLower];
    if (englishDay && englishDay === weekdayEn) return true;
    
    // مقارنة مع اختصارات الأيام
    const shortDayNames: Record<string, string> = {
      'mon': 'monday',
      'tue': 'tuesday',
      'wed': 'wednesday',
      'thu': 'thursday',
      'fri': 'friday',
      'sat': 'saturday',
      'sun': 'sunday'
    };
    
    const shortEnglishDay = shortDayNames[dayLower];
    if (shortEnglishDay && shortEnglishDay === weekdayEn) return true;
    
    return false;
  });
  
  if (!today) {
    console.log('Debug - Current weekday:', weekdayEn, 'Available days:', validWorkingHours.map(w => w.day));
    console.log('Debug - Working hours data structure:', validWorkingHours);
    return { isOpen: false, label: `اليوم: ${weekdayAr} (غير محدد)` };
  }

  // صيغة HH:mm
  const [oh, om] = (today.openTime ?? "00:00").split(":").map(Number);
  const [ch, cm] = (today.closeTime ?? "23:59").split(":").map(Number);
  
  // التحقق من صحة الوقت
  if (isNaN(oh) || isNaN(om) || isNaN(ch) || isNaN(cm)) {
    console.log('Debug - Invalid time format:', today.openTime, today.closeTime);
    return { isOpen: false, label: "تنسيق الوقت غير صحيح" };
  }
  
  const open = new Date(now);
  open.setHours(oh, om, 0, 0);
  const close = new Date(now);
  close.setHours(ch, cm, 59, 999);

  const isOpen = now >= open && now <= close;
  
  // تحويل اسم اليوم إلى العربية للعرض
  const dayNames: Record<string, string> = {
    'monday': 'الاثنين',
    'tuesday': 'الثلاثاء', 
    'wednesday': 'الأربعاء',
    'thursday': 'الخميس',
    'friday': 'الجمعة',
    'saturday': 'السبت',
    'sunday': 'الأحد'
  };
  
  const displayDay = dayNames[today.day.toLowerCase()] || today.day;
  const label = `${displayDay} ${today.openTime}–${today.closeTime}`;
  
  console.log('Debug - Found working hours for today:', {
    day: today.day,
    openTime: today.openTime,
    closeTime: today.closeTime,
    isOpen,
    displayDay
  });
  
  return { isOpen, label };
}

const socialIconMap: Record<string, JSX.Element> = {
  facebook: <FacebookIcon />,
  twitter: <TwitterIcon />,
  instagram: <InstagramIcon />,
  linkedin: <LinkedInIcon />,
  youtube: <YouTubeIcon />,
};

interface Props {
  merchant: MerchantInfo;
  storefront: Storefront;
  ratingValue?: number; // اختياري لو عندك متوسط تقييم ديناميكي
  ratingCount?: number; // اختياري عدد التقييمات
}

export function StoreHeader({
  merchant,
  storefront,
  ratingValue = 4.5,
  ratingCount = 500,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { buttonStyle } = storefront;
  const openState = useMemo(
    () => getOpenNow(merchant.workingHours),
    [merchant.workingHours]
  );

  // إضافة معلومات تصحيح للمطورين
  console.log('Debug - Working Hours:', merchant.workingHours);
  console.log('Debug - Open State:', openState);

  const chipBase = {
    background: "rgba(255,255,255,0.18)",
    color: "var(--on-brand)",
    borderRadius: buttonStyle === "rounded" ? 16 : 0,
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.18)",
  } as const;

  return (
    <Box
      mb={4}
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        color: "var(--on-brand)",
        p: { xs: 3, md: 5 },
        textAlign: "center",
        // خلفية متدرّجة + طبقات ضبابية "زجاج"
        background:
          "linear-gradient(135deg, var(--brand) 0%, rgba(0,0,0,0.4) 100%)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        isolation: "isolate",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: -80,
          background:
            "radial-gradient(600px 300px at 80% -20%, rgba(255,255,255,0.18), transparent 60%)",
          zIndex: 0,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: "-10%",
          bottom: "-20%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          filter: "blur(60px)",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.16), transparent 60%)",
          zIndex: 0,
        },
      }}
    >
      {/* شريط علوي صغير: الحالة + تقييم */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1200,
          mx: "auto",
          mb: 2,
        }}
      >
        <Chip
          label={
            openState.isOpen 
              ? "مفتوح الآن" 
              : openState.label.includes("غير محدد") || openState.label.includes("غير صحيح")
                ? "ساعات العمل غير محددة" 
                : "مغلق حالياً"
          }
          sx={{
            ...chipBase,
            bgcolor: openState.isOpen
              ? "rgba(46, 204, 113, 0.25)"
              : openState.label.includes("غير محدد") || openState.label.includes("غير صحيح")
                ? "rgba(255, 193, 7, 0.25)"
                : "rgba(231, 76, 60, 0.25)",
            borderColor: "rgba(255,255,255,0.25)",
            fontWeight: 700,
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <Rating
            value={ratingValue}
            precision={0.5}
            readOnly
            sx={{ color: "var(--on-brand)" }}
          />
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            ({ratingValue} من {ratingCount.toLocaleString()} تقييم)
          </Typography>
        </Stack>
      </Stack>

      {/* رأس المحتوى */}
      <Box sx={{ position: "relative", zIndex: 2, maxWidth: 1200, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems="center"
          justifyContent="center"
          spacing={{ xs: 3, md: 5 }}
        >
          {/* شعار بزجاج خفيف */}
          {merchant.logoUrl && (
            <Box
              sx={{
                width: isMobile ? 96 : 120,
                height: isMobile ? 96 : 120,
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                p: 1,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(6px)",
                flexShrink: 0,
              }}
            >
              <Avatar
                src={merchant.logoUrl}
                alt={merchant.name}
                variant="rounded"
                sx={{ width: "100%", height: "100%", bgcolor: "transparent" }}
                imgProps={{ style: { objectFit: "cover" } }}
              />
            </Box>
          )}

          {/* النصوص الأساسية */}
          <Box sx={{ textAlign: { xs: "center", md: "start" }, maxWidth: 760 }}>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                fontWeight: 800,
                lineHeight: 1.15,
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {merchant.name}
            </Typography>

            {merchant.businessDescription && (
              <Typography
                variant="h6"
                sx={{
                  opacity: 0.95,
                  mt: 1,
                  mb: 2,
                  textWrap: "balance",
                }}
              >
                {merchant.businessDescription}
              </Typography>
            )}

            {/* معلومات سريعة */}
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              flexWrap="wrap"
              sx={{ justifyContent: { xs: "center", md: "flex-start" }, mb: 2 }}
            >
              {merchant.phone && (
                <Chip
                  icon={<PhoneIcon sx={{ color: "white !important" }} />}
                  label={merchant.phone}
                  sx={chipBase}
                  component="a"
                  href={`tel:${merchant.phone}`}
                  clickable
                />
              )}
              {merchant.addresses?.[0]?.city && (
                <Chip
                  icon={<LocationOnIcon sx={{ color: "white !important" }}/>}
                  label={merchant.addresses[0].city}
                  sx={chipBase}
                />
              )}
              {openState.label && 
               !openState.label.includes("غير محدد") && 
               !openState.label.includes("غير صحيح") && (
                <Chip
                  icon={<ScheduleIcon sx={{ color: "white !important" }}/>}
                  label={openState.label}
                  sx={chipBase}
                />
              )}
            </Stack>

            {/* أزرار CTA */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ justifyContent: { xs: "center", md: "flex-start" } }}
            >
              <Button
                variant="contained"
                size={isMobile ? "medium" : "large"}
                sx={{
                  px: 3,
                  py: 1.25,
                  fontWeight: 800,
                  borderRadius: buttonStyle === "rounded" ? 999 : 1,
                  background: "var(--on-brand)",
                  color: "var(--brand)",
                  "&:hover": {
                    opacity: 0.9,
                    backgroundColor: "var(--on-brand)",
                  },
                }}
                href={merchant.phone ? `tel:${merchant.phone}` : undefined}
              >
                اتصل بنا
              </Button>

              {merchant.storefrontUrl && (
                <Button
                  variant="outlined"
                  size={isMobile ? "medium" : "large"}
                  endIcon={<OpenInNewIcon />}
                  sx={{
                    px: 3,
                    py: 1.25,
                    fontWeight: 700,
                    borderRadius: buttonStyle === "rounded" ? 999 : 1,
                    color: "var(--on-brand)",
                    borderColor: "rgba(255,255,255,0.45)",
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(4px)",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.75)",
                      background: "rgba(255,255,255,0.14)",
                    },
                  }}
                  href={merchant.storefrontUrl}
                  target="_blank"
                  rel="noopener"
                >
                  زيارة موقعنا
                </Button>
              )}
            </Stack>

            {/* سوشيال (اختياري) */}
            {merchant.socialLinks &&
              Object.keys(merchant.socialLinks).length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    mt: 2,
                    justifyContent: { xs: "center", md: "flex-start" },
                  }}
                >
                  {Object.entries(merchant.socialLinks).map(([key, url]) => {
                    if (!url) return null;
                    const icon = socialIconMap[key.toLowerCase()];
                    if (!icon) return null;
                    return (
                      <Tooltip key={key} title={key}>
                        <IconButton
                          component="a"
                          href={url}
                          target="_blank"
                          rel="noopener"
                          sx={{
                            color: "var(--on-brand)",
                            "&:hover": {
                              backgroundColor: "rgba(255,255,255,0.12)",
                            },
                          }}
                          aria-label={key}
                        >
                          {icon}
                        </IconButton>
                      </Tooltip>
                    );
                  })}
                </Stack>
              )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
