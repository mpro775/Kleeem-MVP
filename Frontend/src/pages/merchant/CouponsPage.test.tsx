import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import CouponsPage from "./CouponsPage";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "merchant-1" } }) };
});

vi.mock("@/features/mechant/coupons/ui/CouponsToolbar", () => ({
  __esModule: true,
  default: () => <div data-testid="coupons-toolbar" />,
}));
vi.mock("@/features/mechant/coupons/ui/CouponsTable", () => ({
  __esModule: true,
  default: () => <div data-testid="coupons-table" />,
}));
vi.mock("@/features/mechant/coupons/ui/CouponFormDialog", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/features/mechant/coupons/ui/CouponDetailsDialog", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/features/mechant/coupons/ui/CouponDeleteDialog", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/features/mechant/coupons/ui/CouponGenerateCodesDialog", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/features/mechant/coupons/api", () => ({
  fetchCoupons: vi.fn().mockResolvedValue({
    coupons: [],
    total: 0,
    page: 1,
    limit: 10,
  }),
  createCoupon: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
  generateCouponCodes: vi.fn().mockResolvedValue({ codes: [] }),
}));

test("renders coupons page heading", () => {
  renderWithProviders(<CouponsPage />);
  expect(screen.getByText("إدارة الكوبونات")).toBeInTheDocument();
});

