import { screen } from "@testing-library/react";
import MissingResponsesPage from "./MissingResponsesPage";
import { renderWithProviders } from "@/test/test-utils";

test("renders heading", () => {
  renderWithProviders(<MissingResponsesPage />);
  expect(screen.getByText("الرسائل المنسيّة / غير المفهومة")).toBeInTheDocument();
});
