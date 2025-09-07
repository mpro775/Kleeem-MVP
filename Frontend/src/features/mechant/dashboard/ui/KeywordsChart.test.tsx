import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import KeywordsChart from "./KeywordsChart";

test("يعرض رسالة عدم توفر كلمات", () => {
  renderWithProviders(<KeywordsChart keywords={[]} />);
  expect(screen.getByText(/لا توجد كلمات مفتاحية لعرضها حالياً/)).toBeInTheDocument();
});
