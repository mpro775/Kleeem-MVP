import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import OnboardingLayout from "./OnboardingLayout";
import { vi } from "vitest";

vi.mock("@/auth/AuthLayout", () => ({
  default: ({ children, title }: any) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

test("shows step progress", () => {
  renderWithProviders(
    <OnboardingLayout step={2} total={4} title="My Title">
      <div>child</div>
    </OnboardingLayout>
  );
  expect(screen.getByText(/الخطوة 2 من 4/)).toBeInTheDocument();
  expect(screen.getByText("child")).toBeInTheDocument();
});
