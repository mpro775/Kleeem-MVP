'use client';

// src/components/landing/WhyChooseKaleem.tsx
import { useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  ButtonBase,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslations } from "next-intl";
import { useFeatureCarousel } from "@/features/landing/hooks/useFeatureCarousel";
import { FeatureCard } from "@/features/landing/ui/FeatureCard";
import { featuresConfig } from "@/features/landing/data/featuresData";

interface Props {
  locale: string;
}

export default function WhyChooseKaleem({ locale }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const t = useTranslations('landing.features');
  
  // تحديد اتجاه النص بناءً على اللغة
  const isRTL = locale === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  // على الموبايل نطفئ loop لتفادي ظهور الـ clones عند الأطراف
  const {
    emblaRef,
    scrollSnaps,
    selectedIndex,
    scrollTo,
    scrollPrev,
    scrollNext,
  } = useFeatureCarousel({ loop: !isMobile, direction: isRTL ? 'rtl' : 'ltr' });

  return (
    <Box
      ref={sectionRef}
      id="features"
      sx={{ my: 8, py: 6, backgroundColor: "#f9fafb" }}
      dir={direction}
    >
      <Typography
        variant="h4"
        fontWeight="bold"
        align="center"
        color="primary.dark"
        mb={5}
      >
        {t('title')}
      </Typography>

      <Box
        className="embla"
        sx={{
          position: "relative",
          maxWidth: 1200,
          mx: "auto",
          // CSS variables مثل الديمو الرسمي
          "--slide-height": "19rem",
          "--slide-spacing": "1rem",
          // كارد واحد متوسط على الموبايل، شبكي على الأكبر
          "--slide-size": { xs: "86%", sm: "48%", md: "23.5%" } as React.CSSProperties,
        }}
      >
        {/* ✅ viewport مطابق لعينة Embla */}
        <Box
          className="embla__viewport"
          ref={emblaRef}
          sx={{ overflow: "hidden" }}
          dir={direction}
        >
          {/* ✅ container */}
          <Box
            className="embla__container"
            sx={{
              display: "flex",
              touchAction: "pan-y pinch-zoom",
              // في RTL نستبدل margin-left بـ margin-inline-start (يتحول تلقائيًا)
              marginInlineStart: "calc(var(--slide-spacing) * -1)",
            }}
          >
            {featuresConfig.map((feature, i) => (
              // ✅ slide
              <Box
                key={i}
                className="embla__slide"
                sx={{
                  transform: "translate3d(0,0,0)",
                  flex: "0 0 var(--slide-size)",
                  minWidth: 0,
                  paddingInlineStart: "var(--slide-spacing)",
                  // نوسّط محتوى الشريحة نفسها (الكارد) — هذا أهم شيء
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Box sx={{ width: "100%" }}>
                  <FeatureCard feature={feature} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* في RTL: السهم الأيسر بصريًا يتقدم للأمام */}
        <IconButton
          onClick={scrollNext}
          sx={{
            position: "absolute",
            top: "50%",
            left: { xs: 4, md: -10 },
            transform: "translateY(-50%)",
            zIndex: 1,
            display: { xs: "none", sm: "inline-flex" },
          }}
        >
          <ChevronLeftRoundedIcon />
        </IconButton>
        <IconButton
          onClick={scrollPrev}
          sx={{
            position: "absolute",
            top: "50%",
            right: { xs: 4, md: -10 },
            transform: "translateY(-50%)",
            zIndex: 1,
            display: { xs: "none", sm: "inline-flex" },
          }}
        >
          <ChevronRightRoundedIcon />
        </IconButton>

        {/* نقاط */}
        <Box
          sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 4 }}
        >
          {scrollSnaps.map((_, i) => (
            <ButtonBase
              key={i}
              onClick={() => scrollTo(i)}
              sx={{
                width: i === selectedIndex ? 24 : 12,
                height: 12,
                borderRadius: 6,
                bgcolor:
                  i === selectedIndex ? "primary.main" : "action.selected",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
