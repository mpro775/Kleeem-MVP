import { screen } from "@testing-library/react";
import SupportPage from "./SupportCenterPage";
import { renderWithProviders } from "@/test/test-utils";

test("renders heading", () => {
  renderWithProviders(<SupportPage />);
  expect(screen.getByText("طلب الدعم الفني")).toBeInTheDocument();
});
