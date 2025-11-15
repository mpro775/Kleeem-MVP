import { screen } from "@testing-library/react";
import BannersManagementPage from "./BannersManagementPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/store/ui/BannersEditor", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/storefront-theme/api", () => ({
  getStorefrontInfo: () => Promise.resolve({ banners: [] }),
  updateStorefrontInfo: vi.fn(),
}));


test("renders heading", async () => {
  renderWithProviders(<BannersManagementPage />);
  expect(await screen.findByText("إدارة البانرات الإعلانية")).toBeInTheDocument();
});
