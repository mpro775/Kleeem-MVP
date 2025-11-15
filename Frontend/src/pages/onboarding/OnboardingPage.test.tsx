import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import OnboardingPage from "./OnboardingPage";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { merchantId: "1" }, token: "t", setAuth: vi.fn() }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/auth/api", () => ({
  ensureMerchant: vi.fn().mockResolvedValue({ user: { merchantId: "1" }, accessToken: "t" }),
}));

vi.mock("@/features/onboarding/api", () => ({
  saveBasicInfo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/lib/errors", () => ({ getAxiosMessage: () => "" }));

test("renders onboarding form", async () => {
  renderWithProviders(<OnboardingPage />);
  expect(await screen.findByText("تهيئة نشاطك")).toBeInTheDocument();
});
