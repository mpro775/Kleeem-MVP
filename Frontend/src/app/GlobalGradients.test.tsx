import { renderWithProviders } from "@/test/test-utils";
import GlobalGradients from "./GlobalGradients";

test("renders gradient defs", () => {
  const { container } = renderWithProviders(<GlobalGradients />);
  const gradient = container.querySelector("linearGradient#my-gradient");
  expect(gradient).not.toBeNull();
});
