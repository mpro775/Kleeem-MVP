import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { Routes, Route } from "react-router-dom";
import MerchantLayout from "./MerchantLayout";
import { vi } from "vitest";

vi.mock("@/shared/hooks/useAdminNotifications", () => ({
  useAdminNotifications: () => {},
}));
vi.mock("./Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock("./Topbar", () => ({
  default: ({ extra }: any) => <div data-testid="topbar">{extra}</div>,
}));


test("renders layout with outlet content", () => {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<MerchantLayout />}>
        <Route index element={<div data-testid="child" />}></Route>
      </Route>
    </Routes>,
    { route: "/" }
  );

  expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("topbar")).toBeInTheDocument();
  expect(screen.getByTestId("child")).toBeInTheDocument();
});
