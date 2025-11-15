import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import ProductsPage from "./ProductsPage";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});
vi.mock("@/features/mechant/products/ui/ProductsActions", () => ({
  default: ({ onAddProduct }: any) => (
    <button data-testid="add-btn" onClick={onAddProduct}>
      add
    </button>
  ),
}));
vi.mock("@/features/mechant/products/ui/ProductsTable", () => ({
  default: () => <div data-testid="table" />,
}));
vi.mock("@/features/mechant/products/ui/AddProductDialog", () => ({
  default: ({ open }: any) => (open ? <div data-testid="add-dialog" /> : null),
}));
vi.mock("@/features/mechant/products/ui/EditProductDialog", () => ({
  default: ({ open }: any) => (open ? <div data-testid="edit-dialog" /> : null),
}));


test("opens add product dialog", async () => {
  renderWithProviders(<ProductsPage />);
  await userEvent.click(screen.getByTestId("add-btn"));
  expect(screen.getByTestId("add-dialog")).toBeInTheDocument();
});
