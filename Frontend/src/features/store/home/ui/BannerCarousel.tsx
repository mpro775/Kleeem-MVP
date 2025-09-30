// =========================
// File: src/features/store/ui/BannerCarousel.tsx
// =========================
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import type { Banner } from "@/features/mechant/storefront-theme/type";

export function BannerCarousel({ banners }: { banners: Array<Banner> }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  const active = (banners ?? []).filter((b) => b?.active !== false);
  if (!active.length) return null;
  const loop = active.filter((b) => b.active).length > 1;
  
  return (
    <Box 
      mb={4}
      sx={{
        position: "relative",
        "& .swiper": {
          borderRadius: { xs: 2, md: 3 },
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        },
        "& .swiper-pagination": {
          bottom: { xs: 16, md: 24 },
        },
        "& .swiper-pagination-bullet": {
          width: { xs: 8, md: 12 },
          height: { xs: 8, md: 12 },
          backgroundColor: "rgba(255,255,255,0.6)",
          opacity: 1,
          transition: "all 0.3s ease",
          "&.swiper-pagination-bullet-active": {
            backgroundColor: "var(--on-brand)",
            transform: "scale(1.2)",
            boxShadow: "0 0 12px rgba(255,255,255,0.8)",
          },
        },
        "& .swiper-button-next, & .swiper-button-prev": {
          color: "var(--on-brand)",
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: "50%",
          width: { xs: 40, md: 50 },
          height: { xs: 40, md: 50 },
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.2)",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "rgba(0,0,0,0.5)",
            transform: "scale(1.1)",
          },
          "&::after": {
            fontSize: { xs: "1rem", md: "1.25rem" },
            fontWeight: "bold",
          },
        },
        "& .swiper-button-next": {
          right: { xs: 8, md: 16 },
        },
        "& .swiper-button-prev": {
          left: { xs: 8, md: 16 },
        },
      }}
    >
      <Swiper
        slidesPerView={1}
        loop={loop}
        autoplay={{ 
          delay: 5000, 
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{ 
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={!isMobile}
        modules={[Pagination, Autoplay, Navigation]}
        dir="rtl"
        speed={800}
        grabCursor={true}
        watchSlidesProgress={true}
        onSlideChange={(swiper) => {
          // إضافة تأثيرات إضافية عند تغيير الشريحة
          const activeSlide = swiper.slides[swiper.activeIndex];
          if (activeSlide) {
            activeSlide.style.transform = "scale(1.02)";
            setTimeout(() => {
              activeSlide.style.transform = "scale(1)";
            }, 300);
          }
        }}
      >
        {active
          .filter((b) => b.active)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((banner, idx) => (
            <SwiperSlide key={idx}>
              {banner.image ? (
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: { xs: 200, sm: 300, md: 400, lg: 500 },
                    textAlign: "center",
                    cursor: banner.url ? "pointer" : "default",
                    borderRadius: { xs: 2, md: 3 },
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: banner.url ? "scale(1.02)" : "none",
                      boxShadow: banner.url ? "0 12px 40px rgba(0,0,0,0.2)" : "none",
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.1) 100%)",
                      zIndex: 1,
                      pointerEvents: "none",
                    },
                  }}
                  onClick={() => banner.url && window.open(banner.url, "_blank")}
                >
                  <img
  src={banner.image} 
                      alt={banner.text || `Banner ${idx + 1}`}
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover",
                      display: "block",
                      transition: "transform 0.3s ease",
                    }}
                   
                    
                  />
                  
                  {/* نص البانر مع خلفية شفافة */}
                  {banner.text && (
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)",
                        color: "white",
                        p: { xs: 2, md: 3 },
                        zIndex: 2,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant={isMobile ? "h6" : "h5"}
                        sx={{
                          fontWeight: "bold",
                          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                          lineHeight: 1.2,
                        }}
                      >
                        {banner.text}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: { xs: 120, sm: 150, md: 180 },
                    background: `linear-gradient(135deg, ${banner.color || "var(--brand)"} 0%, ${banner.color || "var(--brand)"}dd 100%)`,
                    color: "var(--on-brand)",
                    textAlign: "center",
                    py: { xs: 2, md: 3 },
                    px: { xs: 2, md: 4 },
                    borderRadius: { xs: 2, md: 3 },
                    fontWeight: "bold",
                    fontSize: { xs: 16, sm: 18, md: 20 },
                    cursor: banner.url ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                    overflow: "hidden",
                    "&:hover": {
                      transform: banner.url ? "scale(1.02)" : "none",
                      boxShadow: banner.url ? "0 8px 25px rgba(0,0,0,0.15)" : "none",
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: "-50%",
                      left: "-50%",
                      width: "200%",
                      height: "200%",
                      background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                      animation: "float 6s ease-in-out infinite",
                      pointerEvents: "none",
                    },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                      animation: "shimmer 3s ease-in-out infinite",
                      pointerEvents: "none",
                    },
                  }}
                  onClick={() => banner.url && window.open(banner.url, "_blank")}
                >
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{
                      position: "relative",
                      zIndex: 1,
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      lineHeight: 1.3,
                    }}
                  >
                    {banner.text}
                  </Typography>
                </Box>
              )}
            </SwiperSlide>
          ))}
      </Swiper>
      
      {/* مؤشرات إضافية للهواتف */}
      {isMobile && active.length > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 1,
            mt: 2,
          }}
        >
          {active.filter(b => b.active).map((_, idx) => (
            <Box
              key={idx}
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.2)",
                transition: "all 0.3s ease",
                "&.active": {
                  backgroundColor: "var(--brand)",
                  transform: "scale(1.2)",
                },
              }}
            />
          ))}
        </Box>
      )}
      
      {/* CSS Animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          .swiper-slide {
            transition: all 0.3s ease;
          }
          
          .swiper-slide-active {
            transform: scale(1.02);
          }
        `}
      </style>
    </Box>
  );
}

