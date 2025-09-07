import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import AddProductDialog from "./AddProductDialog";
import { vi } from "vitest";

vi.mock("../api", () => ({
  createProduct: vi.fn(),
  uploadProductImages: vi.fn(),
}));
vi.mock("../../categories/api", () => ({ getCategoriesFlat: () => Promise.resolve([]) }));
vi.mock("@/shared/ui/TagsInput", () => ({ default: () => <div /> }));
vi.mock("./OfferEditor", () => ({ default: () => <div /> }));
vi.mock("./AttributesEditor", () => ({ default: () => <div /> }));


test("closes on cancel", async () => {
  const onClose = vi.fn();
  renderWithProviders(
    <AddProductDialog open onClose={onClose} merchantId="m1" />
  );
  await userEvent.click(screen.getByText("إلغاء"));
  expect(onClose).toHaveBeenCalled();
});
