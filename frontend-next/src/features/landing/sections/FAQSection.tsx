'use client';

// src/components/landing/FAQSection.tsx
import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Box, 
  Container,
  Stack,
  useTheme,
  alpha
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRef, useState, type RefObject } from "react";
import { useFaqAnimation } from "@/features/landing/hooks/useFaqAnimation";
import { faqs } from "@/features/landing/data/faqData";

export default function FAQSection() {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | false>(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // 2. استدعاء الخطاف وتمرير المرجع له
  useFaqAnimation(sectionRef as RefObject<HTMLElement>);
  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box 
    ref={sectionRef}

      id="faq"
      sx={{ 
        py: { xs: 6, md: 10 },
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
        }
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={4}>
          {/* Header */}
          <Box textAlign="center">
            <Typography 
              className="faq-title"
              variant="h3" 
              component="h2"
              sx={{ 
                fontWeight: 700,
                color: theme.palette.primary.main,
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' }
              }}
            >
              الأسئلة الشائعة
            </Typography>
            <Typography 
              variant="h6" 
                   className="faq-subtitle"
              color="text.secondary"
              sx={{ 
                maxWidth: '600px',
                mx: 'auto',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.6
              }}
            >
              إجابات على أكثر الأسئلة شيوعًا حول منصتنا
            </Typography>
          </Box>

          {/* FAQ List */}
          <Stack spacing={2}>
            {faqs.map((faq, index) => (
              <Accordion
                key={index}
                className="faq-accordion-item" // <-- إضافة className
                expanded={expanded === `panel${index}`}
                onChange={handleChange(`panel${index}`)}
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: '12px !important',
                  boxShadow: theme.shadows[2],
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    margin: '8px 0 !important',
                    boxShadow: theme.shadows[4],
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    boxShadow: theme.shadows[3],
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon 
                      sx={{ 
                        color: theme.palette.primary.main,
                        transition: 'transform 0.3s ease',
                      }} 
                    />
                  }
                  sx={{
                    px: 3,
                    py: 2,
                    minHeight: '72px !important',
                    '&.Mui-expanded': {
                      minHeight: '72px !important',
                    },
                    '& .MuiAccordionSummary-content': {
                      my: '16px !important',
                      '&.Mui-expanded': {
                        my: '16px !important',
                      }
                    }
                  }}
                >
                  <Typography 
                    variant="h6"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      color: 'text.primary',
                      lineHeight: 1.4
                    }}
                  >
                    {faq.q}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    px: 3,
                    pb: 3,
                    pt: 0,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                  }}
                >
                  <Typography 
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      lineHeight: 1.7,
                      fontWeight: 400
                    }}
                  >
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>

          {/* Call to Action */}
          <Box 
            textAlign="center" 
            className="faq-cta" 
            sx={{
              mt: 4,
              p: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 1,
                color: theme.palette.primary.main,
                fontWeight: 600
              }}
            >
              لا تجد إجابة لسؤالك؟
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              تواصل معنا وسيسعد فريق الدعم بمساعدتك
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Typography 
                component="a"
                href="#contact"
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                تواصل معنا
              </Typography>
              <Typography color="text.secondary">|</Typography>
              <Typography 
                component="a"
                href="#support"
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                مركز المساعدة
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}