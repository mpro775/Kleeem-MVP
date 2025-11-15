import { screen } from "@testing-library/react";
import MerchantSettingsPage from "./MerchantSettingsPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/merchant-settings/api", () => ({
  getMerchantInfo: () => Promise.resolve(null),
  updateMerchantInfo: vi.fn(),
}));
vi.mock("@/features/mechant/merchant-settings/sections", () => ({ SECTIONS: [] }));
vi.mock("@/features/mechant/merchant-settings/utils", () => ({ filterUpdatableFields: (d: any) => d }));

test("shows loading indicator initially", () => {
  renderWithProviders(<MerchantSettingsPage />);
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
});
