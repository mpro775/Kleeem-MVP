import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import Dashboard from "./Dashboard";


test("renders admin dashboard", () => {
  renderWithProviders(<Dashboard />);
  expect(screen.getByText(/Kleem Admin/)).toBeInTheDocument();
});
