import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import Header from "./Header";

test("يعرض رسالة اختيار محادثة عند عدم تحديد", () => {
  renderWithProviders(<Header onToggleHandover={() => {}} />);
  expect(screen.getByText("اختر محادثة")).toBeInTheDocument();
});
