import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import Home from "./Home";
import { vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));
vi.mock("@/features/landing", () => ({
  SEOHead: () => <div data-testid="seo" />, 
  JsonLd: () => <div data-testid="jsonld" />, 
  Navbar: () => <div data-testid="navbar" />, 
  HeroSection: () => <div data-testid="hero" />, 
  HowItWorks: () => <div data-testid="how" />, 
  FeaturesSection: () => <div data-testid="features" />, 
  IntegrationsSection: () => <div data-testid="integrations" />, 
  StorefrontSection: () => <div data-testid="storefront" />, 
  DemoSection: () => <div data-testid="demo" />, 
  ComparisonSection: () => <div data-testid="comparison" />, 
  PricingSection: () => <div data-testid="pricing" />, 
  Testimonials: () => <div data-testid="testimonials" />, 
  FAQSection: () => <div data-testid="faq" />, 
  Footer: () => <div data-testid="footer" />,
}));


test("renders landing sections", () => {
  renderWithProviders(<Home />);

  expect(screen.getByTestId("navbar")).toBeInTheDocument();
  expect(screen.getByTestId("hero")).toBeInTheDocument();
  expect(screen.getByTestId("footer")).toBeInTheDocument();
});
