'use client';

import { useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import KaleemLogoGsap from '@/features/landing/sections/KaleemLogoGsap';

const AnimatedWords: React.FC<{ text: string }> = ({ text }) => {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span
          key={index}
          style={{ display: 'inline-block', marginRight: '0.5em' }}
        >
          {word}
        </span>
      ))}
    </>
  );
};

const HeroSection: React.FC<{ locale: string }> = ({ locale }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const router = useRouter();
  const t = useTranslations('landing.hero');

  const h2Ref = useRef<HTMLHeadingElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate heading words
      if (h2Ref.current) {
        gsap.fromTo(
          h2Ref.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.5,
            ease: 'power2.out',
          }
        );
      }

      // Animate subtitle
      if (pRef.current) {
        gsap.fromTo(
          pRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, delay: 1.0, ease: 'power2.out' }
        );
      }

      // Animate button
      if (buttonRef.current) {
        gsap.fromTo(
          buttonRef.current,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.7,
            delay: 1.5,
            ease: 'back.out(1.7)',
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <Box
      id="hero"
      sx={{
        position: 'relative',
        backgroundColor: '#fff',
        py: { xs: 4, sm: 6, md: 12 },
        overflow: 'hidden',
        minHeight: { xs: 'auto', md: '100vh' },
        maxWidth: '100vw',
        width: '100%',
      }}
    >
      {/* زخارف الخلفية */}
      <Box
        component="img"
        src="/assets/Vector.png"
        alt="خلفية زخرفية"
        sx={{
          position: 'absolute',
          top: { xs: -60, md: -80 },
          left: { xs: -60, md: -80 },
          width: { xs: 140, sm: 200, md: 320 },
          height: 'auto',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          display: { xs: 'none', sm: 'block' },
        }}
      />
      <Box
        component="img"
        src="/assets/Vector.png"
        alt="خلفية زخرفية"
        sx={{
          position: 'absolute',
          bottom: { xs: -80, md: -100 },
          right: { xs: -60, md: -100 },
          width: { xs: 180, sm: 260, md: 420 },
          height: 'auto',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          transform: 'rotate(180deg)',
          display: { xs: 'none', sm: 'block' },
        }}
      />
      <Box
        component="img"
        src="/assets/Vector2.png"
        alt="زخرفة مربع حوار"
        sx={{
          position: 'absolute',
          top: { xs: '24%', md: '30%' },
          left: { xs: '12%', md: '20%' },
          width: { xs: 56, sm: 72, md: 90 },
          height: 'auto',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          transform: 'rotate(15deg)',
          display: { xs: 'none', sm: 'block' },
        }}
      />
      <Box
        component="img"
        src="/assets/Vector.png"
        alt="زخرفة مربع حوار"
        sx={{
          position: 'absolute',
          bottom: '25%',
          right: '15%',
          width: { xs: 80, sm: 100, md: 130 },
          height: 'auto',
          opacity: 0.16,
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          transform: 'rotate(-10deg)',
          display: { xs: 'none', sm: 'block' },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
            gap: { xs: 4, sm: 6, md: 8 },
            alignItems: 'center',
            minHeight: { xs: 'auto', md: '70vh' },
          }}
        >
          {/* Text Content */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography
              ref={h2Ref}
              variant={isMdUp ? 'h2' : 'h3'}
              component="h2"
              sx={{
                fontWeight: 'bold',
                color: '#563fa6',
                textAlign: { xs: 'center', md: 'left' },
                fontSize: { xs: '2rem', sm: '2.4rem', md: '2.8rem' },
                lineHeight: { xs: 1.25, md: 1.3 },
              }}
            >
              <AnimatedWords text={t('title')} />
            </Typography>
            <Typography
              ref={pRef}
              variant="h6"
              color="text.secondary"
              sx={{
                my: 3,
                maxWidth: { xs: '100%', sm: 520, md: 560 },
                mx: { xs: 'auto', md: 0 },
                textAlign: { xs: 'center', md: 'left' },
                fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' },
              }}
            >
              {t('description')}
            </Typography>
            <Button
              ref={buttonRef}
              variant="contained"
              size="large"
              onClick={() => router.push(`/${locale}/signup`)}
              sx={{
                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                px: { xs: 4, sm: 5 },
                fontWeight: 'bold',
                boxShadow: 'none',
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#4527a0',
                },
              }}
            >
              {t('cta')}
            </Button>
          </Box>

          {/* Image Container */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              minHeight: { md: 520 },
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

