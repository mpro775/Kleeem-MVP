import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ChecklistPanel from "./ChecklistPanel";

test("يعرض عنوان قائمة التحقق", () => {
  renderWithProviders(<ChecklistPanel checklist={[]} />);
  expect(screen.getByText("قائمة التحقق لإكمال تفعيل المتجر")).toBeInTheDocument();
});
