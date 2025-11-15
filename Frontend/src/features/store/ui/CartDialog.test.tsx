import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import CartDialog from "./CartDialog";
import { vi } from "vitest";

const items = [
  { product: { _id: "p1", name: "Item1", price: 50 }, quantity: 2 },
];
const clearCart = vi.fn();
const removeItem = vi.fn();
const updateQuantity = vi.fn();

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ items, clearCart, removeItem, updateQuantity }),
}));
vi.mock("@/shared/api/axios", () => ({ default: { post: vi.fn() } }));
vi.mock("@/shared/utils/customer", () => ({ saveLocalCustomer: vi.fn() }));


test("moves to customer step", async () => {
  renderWithProviders(
    <CartDialog
      open
      onClose={() => {}}
      merchantId="m1"
      sessionId="s1"
      onOrderSuccess={() => {}}
    />
  );

  expect(screen.getByText("سلة الشراء")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "المتابعة إلى إدخال المعلومات" })
  );
  expect(screen.getByText("معلومات العميل")).toBeInTheDocument();
});
