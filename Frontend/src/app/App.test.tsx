import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import App from "./App";
import { Routes, Route } from "react-router-dom";
import { vi } from "vitest";

vi.mock("./routes/ProtectedRoute", () => ({
  default: ({ children }: any) => <>{children}</>,
}));
vi.mock("./routes/RoleRoute", () => ({
  default: ({ children }: any) => <>{children}</>,
}));
vi.mock("./GlobalGradients", () => ({
  default: () => <div data-testid="global-gradients" />,
}));
vi.mock("@/pages/merchant/InstructionsPage", () => ({
  default: () => <div data-testid="instructions-page" />,
}));
vi.mock("@/pages/public/Home", () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));


test("renders home route", async () => {
  renderWithProviders(
    <Routes>
      <Route path="/*" element={<App />} />
    </Routes>,
    { route: "/" }
  );

  expect(await screen.findByTestId("home-page")).toBeInTheDocument();
});
