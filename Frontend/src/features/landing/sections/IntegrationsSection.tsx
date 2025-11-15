// src/components/landing/IntegrationsSection.tsx
import { useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  ButtonBase,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCarousel } from "@/features/landing/hooks/useCarousel";
import { IntegrationCard } from "@/features/landing/ui/IntegrationCard";
import { items } from "@/features/landing/data/integrationsData";

gsap.registerPlugin(ScrollTrigger);

export default function IntegrationsSection() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm")); // <600px
  const isMd = useMediaQuery(theme.breakpoints.between("sm", "md")); // 600–900
  const sectionRef = useRef<HTMLDivElement>(null);

  // كم كارد نعرض؟
  const slidesPerView = isSm ? 1 : isMd ? 2 : 4;

  const {
    emblaRef,
    scrollSnaps,
    selectedIndex,
    scrollTo,
    scrollPrev,
    scrollNext,
  } = useCarousel({
    emblaOptions: {
      loop: !isSm, // ✅ الموبايل بدون loop
      align: isSm ? "center" : "start",
      containScroll: "trimSnaps",
      slidesToScroll: 1,
      direction: "rtl",
    },
    autoplayOptions: { delay: 6000, stopOnInteraction: true },
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });
      const title = sectionRef.current?.querySelector(".integrations-title");
      if (title) {
        tl.from(title, {
          opacity: 0,
          y: -50,
          duration: 0.8,
          ease: "power3.out",
        }).from(
          gsap.utils.toArray(".integration-card-item"),
          {
            opacity: 0,
            y: 50,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.12,
          },
          "-=0.4"
        );
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <Box
      ref={sectionRef}
      id="integrations"
      sx={{ py: 8, bgcolor: "grey.50" }}
      dir="rtl"
    >
      <Typography
        className="integrations-title"
        variant="h4"
        fontWeight="bold"
        align="center"
        color="primary.dark"
        mb={6}
      >
        تكاملات تمنحك القوة
      </Typography>

      <Box
        className="embla"
        sx={
          {
            position: "relative",
            maxWidth: 1200,
            mx: "auto",
            // متغيرات للتحكم بالحجم مثل الديمو
            "--slide-spacing": "16px",
            "--slide-size": isSm
              ? "86%"
              : isMd
              ? "48%"
              : `${100 / slidesPerView}%`,
          } as any
        }
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
              marginInlineStart: "calc(var(--slide-spacing) * -1)",
            }}
          >
            {items.map((item, i) => (
              // slide
              <Box
                key={i}
                className="embla__slide integration-card-item"
                sx={{
                  transform: "translate3d(0,0,0)",
                  flex: "0 0 var(--slide-size)",
                  minWidth: 0,
                  paddingInlineStart: "var(--slide-spacing)",
                  display: "flex",
                  justifyContent: "center", // ✅ الكارد بالوسط
                }}
              >
                <Box sx={{ width: "100%" }}>
                  <IntegrationCard item={item} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ✅ RTL: اليسار = Next، اليمين = Prev */}
        <IconButton
          onClick={scrollNext}
          sx={{
            position: "absolute",
            top: "50%",
            left: { xs: 4, sm: -10 },
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
            right: { xs: 4, sm: -10 },
            transform: "translateY(-50%)",
            zIndex: 1,
            display: { xs: "none", sm: "inline-flex" },
          }}
        >
          <ChevronRightRoundedIcon />
        </IconButton>
      </Box>

      {/* النقاط */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 4 }}>
        {scrollSnaps.map((_, i) => (
          <ButtonBase
            key={i}
            onClick={() => scrollTo(i)}
            sx={{
              width: i === selectedIndex ? 24 : 12,
              height: 12,
              borderRadius: 6,
              bgcolor: i === selectedIndex ? "primary.main" : "action.selected",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
