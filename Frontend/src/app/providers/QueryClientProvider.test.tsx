import { render, screen } from "@testing-library/react";
import AppProviders from "./QueryClientProvider";

test("renders child with query client", () => {
  render(<AppProviders><div>child</div></AppProviders>);
  expect(screen.getByText("child")).toBeInTheDocument();
});
