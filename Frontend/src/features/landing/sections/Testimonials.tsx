// src/components/landing/TestimonialsSection.tsx
import {
  Box,
  Typography,
  ButtonBase,
  useTheme,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { useCallback, useMemo } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import { TestimonialCard } from "../ui/TestimonialCard";
import { testimonials } from "../data/testimonialsData";
import { useCarousel } from "../hooks/useCarousel";

export default function TestimonialsSection() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));

  // ✅ RTL + containScroll + إطفاء loop على الموبايل
  const {
    emblaRef,
    emblaApi,
    scrollSnaps,
    selectedIndex,
    scrollTo,
    scrollPrev,
    scrollNext,
  } = useCarousel({
    emblaOptions: {
      direction: "rtl",
      align: "center",
      containScroll: "trimSnaps",
      slidesToScroll: 1,
      loop: !isSm, // على الموبايل: لا
    },
    autoplayOptions: {
      delay: 4000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    },
  });

  // ✅ Tween آمن يعتمد على progress وعدد الـsnaps
  const tweenValues = useMemo(() => {
    if (!emblaApi) return [];
    const progress = emblaApi.scrollProgress();
    const snaps = emblaApi.scrollSnapList();
    return snaps.map((snap) => {
      const diff = snap - progress;
      const factor = 1 - Math.abs(diff);
      return Math.max(0, factor); // 0 → بعيد، 1 → في المنتصف
    });
  }, [emblaApi, selectedIndex]); // يعاد الحساب عند التبدّل

  return (
    <Box
      id="testimonials"
      sx={{
        py: 12,
        px: { xs: 0, md: 3 },
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        position: "relative",
        overflow: "hidden",
      }}
      dir="rtl"
    >
      {/* زخارف */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(0, 180, 216, 0.05)",
          filter: "blur(60px)",
          transform: "translate(50%, -50%)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(0, 119, 182, 0.05)",
          filter: "blur(70px)",
          transform: "translate(-50%, 50%)",
        }}
      />

      {/* العنوان */}
      <Typography
        variant="h4"
        align="center"
        sx={{
          fontWeight: "bold",
          color: theme.palette.primary.dark,
          mb: 1.5,
          fontSize: { xs: "1.8rem", md: "2.4rem" },
          position: "relative",
          display: "inline-block",
          left: "50%",
          transform: "translateX(-50%)",
          "&:after": {
            content: '""',
            position: "absolute",
            bottom: -10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 80,
            height: 4,
            background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
            borderRadius: 2,
          },
        }}
      >
        آراء عملائنا
      </Typography>

      <Typography
        variant="body1"
        align="center"
        sx={{
          color: theme.palette.text.secondary,
          maxWidth: 700,
          mx: "auto",
          mb: 5,
        }}
      >
        انظر ماذا يقول عملاؤنا عن تجربتهم مع Kaleem
      </Typography>

      {/* السلايدر: بنية Embla الرسمية + CSS متغيرات */}
      <Box sx={{ position: "relative", mx: "auto", maxWidth: 1400 }}>
        <Box
          className="embla"
          sx={{
            "--slide-spacing": "16px",
            "--slide-size": { xs: "86%", sm: "48%", md: "32%" } as any, // ✅ كارد واحد وسط على الموبايل
          }}
        >
          {/* viewport */}
          <Box
            className="embla__viewport"
            ref={emblaRef}
            sx={{ overflow: "hidden" }}
            dir="rtl"
          >
            {/* container */}
            <Box
              className="embla__container"
              sx={{
                display: "flex",
                touchAction: "pan-y pinch-zoom",
                marginInlineStart: "calc(var(--slide-spacing) * -1)", // بديل gap
              }}
            >
              {testimonials.map((item, i) => (
                // slide
                <Box
                  key={i}
                  className="embla__slide"
                  sx={{
                    transform: "translate3d(0,0,0)",
                    flex: "0 0 var(--slide-size)",
                    minWidth: 0,
                    paddingInlineStart: "var(--slide-spacing)",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <TestimonialCard
                      testimonial={item}
                      // ✅ تأثير لطيف حسب القرب من المركز
                      scale={(tweenValues[i] ?? 0) * 0.1 + 0.9}
                      opacity={(tweenValues[i] ?? 0) * 0.5 + 0.5}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* في RTL: اليسار = Next، اليمين = Prev */}
        <IconButton
          onClick={scrollNext}
          sx={{
            position: "absolute",
            top: "50%",
            left: { xs: 6, md: -10 },
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
            right: { xs: 6, md: -10 },
            transform: "translateY(-50%)",
            zIndex: 1,
            display: { xs: "none", sm: "inline-flex" },
          }}
        >
          <ChevronRightRoundedIcon />
        </IconButton>
      </Box>

      {/* النقاط */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "center", gap: 1.5 }}>
        {scrollSnaps.map((_, i) => (
          <ButtonBase
            key={i}
            onClick={() => scrollTo(i)}
            sx={{
              width: i === selectedIndex ? 24 : 12,
              height: 12,
              borderRadius: 6,
              bgcolor: i === selectedIndex ? "primary.main" : "divider",
              transition: "all .3s ease",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
