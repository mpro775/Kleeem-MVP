import { screen } from "@testing-library/react";
import CategoriesTable from "./CategoriesTable";
import { renderWithProviders } from "@/test/test-utils";
vi.mock("./EditCategoryDialog", () => ({ default: () => null }));
vi.mock("./DeleteCategoryDialog", () => ({ default: () => null }));

test("shows empty message", () => {
  renderWithProviders(
    <CategoriesTable categories={[]} merchantId="m1" onRefresh={() => {}} />
  );
  expect(screen.getByText("لا توجد فئات بعد.")).toBeInTheDocument();
});
