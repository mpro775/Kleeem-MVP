import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import PromotionsPage from "./PromotionsPage";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "merchant-1" } }) };
});

vi.mock("@/features/mechant/promotions/ui/PromotionsToolbar", () => ({
  __esModule: true,
  default: () => <div data-testid="promotions-toolbar" />,
}));
vi.mock("@/features/mechant/promotions/ui/PromotionsTable", () => ({
  __esModule: true,
  default: () => <div data-testid="promotions-table" />,
}));
vi.mock("@/features/mechant/promotions/ui/PromotionFormDialog", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/features/mechant/promotions/ui/PromotionDetailsDialog", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/features/mechant/promotions/ui/PromotionDeleteDialog", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/features/mechant/promotions/api", () => ({
  fetchPromotions: vi.fn().mockResolvedValue({
    promotions: [],
    total: 0,
    page: 1,
    limit: 10,
  }),
  createPromotion: vi.fn(),
  updatePromotion: vi.fn(),
  deletePromotion: vi.fn(),
}));

test("renders promotions page heading", () => {
  renderWithProviders(<PromotionsPage />);
  expect(screen.getByText("إدارة العروض الترويجية")).toBeInTheDocument();
});

