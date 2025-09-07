import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ChatHeader from "./ChatHeader";

test("يعرض عنوان كليم", () => {
  renderWithProviders(<ChatHeader />);
  expect(screen.getByText("كَلِيم")).toBeInTheDocument();
});
