import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("react-svg", () => ({ ReactSVG: () => <div data-testid="svg" /> }));
vi.mock("gsap", () => ({ to: () => {}, fromTo: () => {}, set: () => {}, delayedCall: () => {} }));
import KaleemLogoGsapProSafe from "./KaleemLogoGsap";

test("يعرض شعار كليم بـGSAP", () => {
  renderWithProviders(<KaleemLogoGsapProSafe float={false} hoverBoost={false} />);
  expect(screen.getByTestId("svg")).toBeInTheDocument();
});
