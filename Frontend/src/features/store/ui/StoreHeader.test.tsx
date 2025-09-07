import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { StoreHeader } from "./StoreHeader";

test("renders store name", () => {
  const merchant: any = { name: "متجر", logoUrl: "", businessDescription: "", phone: null, addresses: [], workingHours: [] };
  const storefront: any = { primaryColor: "#000", secondaryColor: "#fff", buttonStyle: "rounded" };
  renderWithProviders(<StoreHeader merchant={merchant} storefront={storefront} />);
  expect(screen.getByText("متجر")).toBeInTheDocument();
});
