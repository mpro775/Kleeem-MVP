import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import OrdersPage from "./OrdersPage";
import { vi } from "vitest";
import axiosInstance from "@/shared/api/axios";

vi.mock("@/shared/api/axios", () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
const mockGet = vi.mocked(axiosInstance.get);


test("shows message when no orders", async () => {
  mockGet.mockResolvedValue({ data: [] });
  renderWithProviders(<OrdersPage />, { route: "/orders" });
  expect(await screen.findByText("لا توجد طلبات.")).toBeInTheDocument();
});
