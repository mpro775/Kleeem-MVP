import { screen } from "@testing-library/react";
import CategoriesPage from "./CategoriesPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/categories/ui/CategoryTree", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/categories/ui/AddCategoryDialog", () => ({ default: () => null }));
vi.mock("@/features/mechant/categories/ui/EditCategoryDialog", () => ({ default: () => null }));
vi.mock("@/features/mechant/categories/ui/DeleteCategoryDialog", () => ({ default: () => null }));

test("renders heading", () => {
  renderWithProviders(<CategoriesPage />);
  expect(screen.getByText("إدارة الفئات")).toBeInTheDocument();
});
