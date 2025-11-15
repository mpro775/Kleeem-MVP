import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { StoreNavbar } from "./StoreNavbar";
import { vi } from "vitest";

window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as any;
};

vi.mock("@/context/CartContext", () => ({ useCart: () => ({ items: [] }) }));
vi.mock("@/shared/utils/session", () => ({ getSessionId: () => "sid" }));
vi.mock("@/shared/utils/customer", () => ({ getLocalCustomer: () => ({}) }));
vi.mock("./CartDialog", () => ({ default: () => <div data-testid="cart" /> }));
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig();
  return { ...(actual as any), useParams: () => ({ slugOrId: "s1" }), useNavigate: () => vi.fn() };
});

test("renders navbar with merchant name", () => {
  const merchant: any = { _id: "m1", name: "متجري", logoUrl: "" };
  const storefront: any = { primaryColor: "#000" };
  renderWithProviders(<StoreNavbar merchant={merchant} storefront={storefront} />);
  expect(screen.getByText("متجري")).toBeInTheDocument();
});
