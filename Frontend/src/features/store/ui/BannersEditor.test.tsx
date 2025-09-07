import { screen } from "@testing-library/react";
import BannersEditor from "./BannersEditor";
import { renderWithProviders } from "@/test/test-utils";

test("renders banner editor basics", () => {
  renderWithProviders(<BannersEditor merchantId="m1" banners={[]} onChange={() => {}} />);
  expect(screen.getByText(/البنرات: 0\/5/)).toBeInTheDocument();
  expect(screen.getByText("حفظ التغييرات")).toBeInTheDocument();
});
