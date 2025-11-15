import { screen, fireEvent } from "@testing-library/react";
import { CategoryFilter } from "./CategoryFilter";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

test("renders categories and handles selection", () => {
  const categories = [
    { _id: "1", name: "Cat1" },
    { _id: "2", name: "Cat2" },
  ];
  const handle = vi.fn();
  renderWithProviders(
    <CategoryFilter categories={categories as any} activeCategory={null} onChange={handle} />
  );
  expect(screen.getByText("جميع التصنيفات")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Cat1"));
  expect(handle).toHaveBeenCalledWith("1");
});
