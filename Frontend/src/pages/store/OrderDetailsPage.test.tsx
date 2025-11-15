import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { Routes, Route } from "react-router-dom";
import OrderDetailsPage from "./OrderDetailsPage";
import { vi } from "vitest";
import axiosInstance from "@/shared/api/axios";

vi.mock("@/shared/api/axios", () => ({ default: { get: vi.fn() } }));
const mockGet = vi.mocked(axiosInstance.get);

const order = {
  _id: "DEMO-1",
  status: "pending",
  merchantId: "m1",
  products: [{ name: "Item", price: 50, quantity: 2 }],
  customer: { name: "Ali", phone: "123" },
};
localStorage.setItem("kleem:lastDemoOrder", JSON.stringify(order));
mockGet.mockResolvedValue({ data: { merchant: { name: "M" } } });


test("renders demo order from localStorage", async () => {
  renderWithProviders(
    <Routes>
      <Route path="/store/:slugOrId/order/:orderId" element={<OrderDetailsPage />} />
    </Routes>,
    { route: "/store/demo/order/DEMO-1" }
  );

  expect(await screen.findByText(/الطلب #DEMO-1/)).toBeInTheDocument();
  expect(screen.getByText("Item")).toBeInTheDocument();
});
