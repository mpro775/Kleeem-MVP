import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import HeroSection from "./HeroSection";
import { vi } from "vitest";

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => vi.fn() };
});

test("يعرض العنوان وزر الدعوة للتسجيل", () => {
  renderWithProviders(<HeroSection />);
  expect(screen.getByRole("heading", { name: /دع كليم يرد على عملائك/i })).toBeInTheDocument();
  const cta = screen.getByRole("button", { name: /أبدأ مع كليم الآن مجاناً/i });
  expect(cta).toBeInTheDocument();
});
