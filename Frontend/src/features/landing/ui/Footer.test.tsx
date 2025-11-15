import { screen } from "@testing-library/react";
import Footer from "./Footer";
import { renderWithProviders } from "@/test/test-utils";

test("shows brand name", () => {
  renderWithProviders(<Footer />);
  expect(screen.getByText("كليم")).toBeInTheDocument();
});
