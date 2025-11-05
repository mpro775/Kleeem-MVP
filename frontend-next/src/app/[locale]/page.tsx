import {  Footer, HeroSection, Navbar } from '@/features/landing';
import HowItWorks from '@/features/landing/sections/HowItWorks';
import WhyChooseKaleem from '@/features/landing/sections/WhyChooseKaleem';
import DemoSection from '@/features/landing/sections/DemoSection';
import IntegrationsSection from '@/features/landing/sections/IntegrationsSection';
import ComparisonSection from '@/features/landing/sections/ComparisonSection';
import PricingSection from '@/features/landing/sections/PricingSection';
import { Box } from '@mui/material';
import Testimonials from '@/features/landing/sections/Testimonials';
import FAQSection from '@/features/landing/sections/FAQSection';
import CTASection from '@/features/landing/sections/CTASection';


export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <Box>
      <Navbar />
      <HeroSection locale={locale} />
      <WhyChooseKaleem locale={locale} />
      <HowItWorks />
      <DemoSection />
      <IntegrationsSection />
      <ComparisonSection />
      <PricingSection />
      <Testimonials />
      <FAQSection />
      <CTASection locale={locale} />
      <Footer />
    </Box>
  );
}

