import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { Routes, Route } from "react-router-dom";
import ProductDetailsPage from "./ProductDetailsPage";
import { vi } from "vitest";
import axiosInstance from "@/shared/api/axios";

vi.mock("@/shared/api/axios", () => ({ default: { get: vi.fn() } }));
const mockGet = vi.mocked(axiosInstance.get);
const mockAdd = vi.fn();
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ addItem: mockAdd }),
}));

const product = {
  _id: "p1",
  name: "Test Product",
  price: 100,
  images: ["img.jpg"],
  status: "active",
};


test("fetches product and adds to cart", async () => {
  mockGet.mockResolvedValueOnce({ data: product });
  renderWithProviders(
    <Routes>
      <Route path="/store/:slugOrId/product/:productId" element={<ProductDetailsPage />} />
    </Routes>,
    { route: "/store/test/product/p1" }
  );

  expect(await screen.findByText("Test Product")).toBeInTheDocument();
  const btn = screen.getByRole("button", { name: "أضف إلى السلة" });
  await userEvent.click(btn);
  expect(mockAdd).toHaveBeenCalled();
});
