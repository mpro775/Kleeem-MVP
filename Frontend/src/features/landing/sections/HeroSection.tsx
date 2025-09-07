// HeroSection.tsx
import React, { useEffect, useRef, type RefObject } from "react"; // يجب استيراد React لتعريف المكونات
import {
  Box,
  Button,
  Container,
  Typography,
  useMediaQuery,
} from "@mui/material";
import bgShape from "@/assets/Vector.png";
import bgShape2 from "@/assets/Vector2.png";
import { useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import KaleemLogoGsap from "./KaleemLogoGsap";
import { gsap } from "gsap";
// تعريف واجهة للـ Props
import { useStaggeredAnimation } from "@/features/landing/hooks/useStaggeredAnimation";
const AnimatedWords: React.FC<{ text: string }> = ({ text }) => {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <span
          key={index}
          style={{ display: "inline-block", marginRight: "0.5em" }}
        >
          {word}
        </span>
      ))}
    </>
  );
};

const HeroSection: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const h2Ref = useRef<HTMLHeadingElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useStaggeredAnimation(h2Ref as RefObject<HTMLElement>, 0.5); // يبدأ العنوان بعد 0.5 ثانية
  useStaggeredAnimation(pRef as RefObject<HTMLElement>, 1.0); // يبدأ النص الفرعي بعد 1 ثانية
  useEffect(() => {
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          delay: 1.5,
          ease: "back.out(1.7)",
        }
      );
    }
  }, []);
  const navigate = useNavigate();
  return (
    <Box
      id="hero"
      sx={{
        position: "relative",
        backgroundColor: "#fff",
        py: { xs: 4, sm: 6, md: 12 },
        overflow: "hidden",
        minHeight: { xs: "auto", md: "100vh" },
        maxWidth: "100vw",
        width: "100%",
      }}
    >
      {/* زخارف الخلفية */}
      <Box
        component="img"
        src={bgShape}
        alt="خلفية زخرفية"
        sx={{
          position: "absolute",
          top: { xs: -60, md: -80 },
          left: { xs: -60, md: -80 },
          width: { xs: 140, sm: 200, md: 320 },
          height: "auto",
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          display: { xs: "none", sm: "block" },
        }}
      />
      <Box
        component="img"
        src={bgShape}
        alt="خلفية زخرفية"
        sx={{
          position: "absolute",
          bottom: { xs: -80, md: -100 },
          right: { xs: -60, md: -100 },
          width: { xs: 180, sm: 260, md: 420 },
          height: "auto",
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          transform: "rotate(180deg)",
          display: { xs: "none", sm: "block" },
        }}
      />
      <Box
        component="img"
        src={bgShape2}
        alt="زخرفة مربع حوار"
        sx={{
          position: "absolute",
          top: { xs: "24%", md: "30%" },
          left: { xs: "12%", md: "20%" },
          width: { xs: 56, sm: 72, md: 90 },
          height: "auto",
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          transform: "rotate(15deg)",
          display: { xs: "none", sm: "block" },
        }}
      />
      <Box
        component="img"
        src={bgShape}
        alt="زخرفة مربع حوار"
        sx={{
          position: "absolute",
          bottom: "25%",
          right: "15%",
          width: { xs: 80, sm: 100, md: 130 },
          height: "auto",
          opacity: 0.16,
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          transform: "rotate(-10deg)",
          display: { xs: "none", sm: "block" },
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" },
            gap: { xs: 4, sm: 6, md: 8 },
            alignItems: "center",
            minHeight: { xs: "auto", md: "70vh" },
          }}
        >
          {/* Text Content */}
          <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
            <Typography
              ref={h2Ref}
              variant={isMdUp ? "h2" : "h3"}
              component="h2"
              sx={{
                fontWeight: "bold",
                color: "#563fa6",
                textAlign: { xs: "center", md: "left" },
                fontSize: { xs: "2rem", sm: "2.4rem", md: "2.8rem" },
                lineHeight: { xs: 1.25, md: 1.3 },
              }}
            >
              <AnimatedWords text="دع كليم يرد على عملائك خلال ثوانٍ" />
            </Typography>
            <Typography
              ref={pRef}
              variant="h6"
              color="text.secondary"
              sx={{
                my: 3,
                maxWidth: { xs: "100%", sm: 520, md: 560 },
                mx: { xs: "auto", md: 0 },
                textAlign: { xs: "center", md: "left" },
                fontSize: { xs: "1rem", sm: "1.05rem", md: "1.1rem" },
              }}
            >
              بسط التواصل، وخلّي المساعد الذكي يشرح منتجاتك، يرد على الأسئلة،
              ويقترح الأفضل تلقائيًا.
            </Typography>
            <Button
              ref={buttonRef}
              variant="contained"
              size="large"
              onClick={() => navigate("/signup")}
              sx={{
                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                px: { xs: 4, sm: 5 },
                fontWeight: "bold",
                boxShadow: "none",
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "#4527a0",
                },
              }}
            >
              أبدأ مع كليم الآن مجاناً
            </Button>
          </Box>

          {/* Image Container */}
          <Box
            sx={{
              display: { xs: "none", sm: "none", md: "none", lg: "flex" },
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              minHeight: { lg: 520 },
            }}
          >
            <KaleemLogoGsap size={isXs ? 140 : isMdUp ? 500 : 180} speed={1} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;
