import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { ProductCard } from "./ProductCard";
import { vi } from "vitest";

const product: any = {
  _id: "1",
  name: "Product",
  price: 20,
  images: [],
  status: "active",
  keywords: [],
};


test("calls onAddToCart when button clicked", async () => {
  const onAdd = vi.fn();
  const onOpen = vi.fn();
  renderWithProviders(
    <ProductCard product={product} onAddToCart={onAdd} onOpen={onOpen} viewMode="grid" />
  );

  expect(screen.getByText("Product")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "أضف إلى السلة" }));
  expect(onAdd).toHaveBeenCalledWith(product);
});
