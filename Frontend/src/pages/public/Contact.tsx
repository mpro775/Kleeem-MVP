import { useMemo } from "react";
import { Box, Container, Grid, Typography, Stack, Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LockIcon from "@mui/icons-material/Lock";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import EmailIcon from "@mui/icons-material/Email";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";

import {
  ContactForm,
  ContactInfo,
  ContactMethodCard,
  FaqAccordion,
  defaultContactConfig,
  type ContactConfig,
} from "@/features/landing/contact";
import { Navbar, Footer } from "@/features/landing";
import SEOHead from "@/features/landing/seo/SEOHead"; // لو المسار مختلف عدّله

const GradientHero = styled(Box)(({ theme }) => ({
  background: `radial-gradient(1200px 400px at 90% -10%, ${theme.palette.primary.main}22, transparent 60%), linear-gradient(135deg, ${theme.palette.primary.main}22, transparent)`,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export default function ContactPage({ config }: { config?: ContactConfig }) {
  const cfg = { ...defaultContactConfig, ...(config ?? {}) };

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: `${cfg.businessName} — تواصل معنا`,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      about: "دعم فني ومبيعات وفواتير وشراكات",
    }),
    [cfg.businessName]
  );

  return (
    <Box dir="rtl">
       <SEOHead
        title="تواصل معنا — كليم"
        description="فريق كليم جاهز لمساعدتك عبر واتساب والبريد والهاتف. أرسل لنا نموذج التواصل."
        canonical="https://kaleem-ai.com/contact"
        ogImage="https://kaleem-ai.com/og-image.jpg"
      />
      <Navbar />
      <GradientHero>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ py: { xs: 6, md: 10 } }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="h3" fontWeight={800} gutterBottom>
                نسمعك — خلّنا نساعدك
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                فريق {cfg.businessName} جاهز يرد عليك عبر القنوات اللي تفضّلها.
                اختر قناة سريعة أو أرسل لنا نموذج التواصل.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip
                  icon={<ScheduleIcon />}
                  label="عادةً نرد خلال 4–8 ساعات"
                  sx={{ borderRadius: 2 }}
                />
                <Chip
                  icon={<VerifiedUserIcon />}
                  label="SLA مضمونة"
                  sx={{ borderRadius: 2 }}
                />
                <Chip
                  icon={<LockIcon />}
                  label="بياناتك مشفّرة"
                  sx={{ borderRadius: 2 }}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2}>
                {cfg.whatsapp && (
                  <ContactMethodCard
                    icon={<WhatsAppIcon color="success" />}
                    title="واتساب الرسمي"
                    subtitle="رد سريع خلال أوقات العمل"
                    href={cfg.whatsapp}
                  />
                )}
                {cfg.telegram && (
                  <ContactMethodCard
                    icon={<TelegramIcon color="primary" />}
                    title="تليجرام"
                    subtitle="قناة بديلة للدردشة"
                    href={cfg.telegram}
                  />
                )}
                {cfg.email && (
                  <ContactMethodCard
                    icon={<EmailIcon />}
                    title="البريد الإلكتروني"
                    subtitle={cfg.email}
                    href={`mailto:${cfg.email}`}
                  />
                )}
                {cfg.phone && (
                  <ContactMethodCard
                    icon={<PhoneInTalkIcon />}
                    title="الهاتف"
                    subtitle={cfg.phone}
                    href={`tel:${cfg.phone}`}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </GradientHero>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 7 }}>
            <ContactForm
              config={cfg}
              onSuccess={(r) => console.log("Ticket:", r.ticketNumber)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <ContactInfo config={cfg} />
            {cfg.showFaq && (
              <Box sx={{ mt: 3 }}>
                <FaqAccordion />
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Footer />
    </Box>
  );
}
