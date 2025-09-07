import { screen } from "@testing-library/react";
import { renderWithProviders, waitForLoadingToFinish } from "@/test/test-utils";
import ProductsTable from "./ProductsTable";
import { vi } from "vitest";

const mockProducts = [
  {
    _id: "p1",
    name: "منتج",
    description: "وصف",
    category: "cat",
    price: 10,
    hasActiveOffer: false,
    isAvailable: true,
    source: "manual",
    images: [],
  },
];

vi.mock("../api", () => ({
  getMerchantProducts: vi.fn(() => Promise.resolve(mockProducts)),
  deleteProduct: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/shared/utils/money", () => ({ formatMoney: () => "10" }));
vi.mock("@/shared/utils/render", () => ({ toDisplayString: (v: any) => String(v) }));

window.confirm = vi.fn(() => false);

test("renders products", async () => {
  renderWithProviders(
    <ProductsTable merchantId="m1" onRefresh={() => {}} />
  );
  await waitForLoadingToFinish();
  expect(await screen.findByText("منتج")).toBeInTheDocument();
});
