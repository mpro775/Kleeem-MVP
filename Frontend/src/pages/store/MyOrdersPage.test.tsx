import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { Routes, Route } from "react-router-dom";
import MyOrdersPage from "./MyOrdersPage";
import { vi } from "vitest";
import axiosInstance from "@/shared/api/axios";

vi.mock("@/shared/utils/session", () => ({ getSessionId: () => "sid" }));
vi.mock("@/shared/utils/customer", () => ({ getLocalCustomer: () => ({ phone: "555" }) }));
vi.mock("@/shared/api/axios", () => ({ default: { get: vi.fn() } }));
const mockGet = vi.mocked(axiosInstance.get);

mockGet.mockImplementation((url: string) => {
  if (url === "/storefront/test") {
    return Promise.resolve({ data: { merchant: { _id: "m1" } } });
  }
  if (url === "/storefront/merchant/m1/my-orders") {
    return Promise.resolve({ data: { orders: [{ _id: "o1", customer: { name: "Ali", phone: "555" }, products: [{ price: 10, quantity: 1 }], status: "pending", createdAt: "2024" }] } });
  }
  return Promise.resolve({ data: {} });
});


test("renders user's orders", async () => {
  renderWithProviders(
    <Routes>
      <Route path="/store/:slugOrId/orders" element={<MyOrdersPage />} />
    </Routes>,
    { route: "/store/test/orders" }
  );

  expect(await screen.findByText("طلباتي")).toBeInTheDocument();
  expect(await screen.findByText("Ali")).toBeInTheDocument();
});
