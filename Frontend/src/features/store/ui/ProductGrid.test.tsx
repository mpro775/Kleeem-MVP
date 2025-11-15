import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { ProductGrid } from "./ProductGrid";
import { vi } from "vitest";

vi.mock("./ProductCard", () => ({
  ProductCard: ({ product }: any) => <div data-testid="product">{product.name}</div>,
}));

test("shows empty state when no products", () => {
  renderWithProviders(
    <ProductGrid products={[]} onAddToCart={() => {}} onOpen={() => {}} />
  );
  expect(screen.getByText("لم يتم العثور على منتجات")).toBeInTheDocument();
});

test("renders products when provided", () => {
  const products: any = [{ _id: "1", name: "P1", price: 1 }];
  renderWithProviders(
    <ProductGrid products={products} onAddToCart={() => {}} onOpen={() => {}} />
  );
  expect(screen.getByTestId("product")).toBeInTheDocument();
});
