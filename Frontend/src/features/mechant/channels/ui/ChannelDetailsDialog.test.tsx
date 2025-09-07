import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ChannelDetailsDialog from "./ChannelDetailsDialog";

test("يعرض رسالة عند عدم وجود بيانات", () => {
  renderWithProviders(
    <ChannelDetailsDialog open onClose={() => {}} title="واتساب" />
  );
  expect(screen.getByText("لا توجد بيانات لهذه القناة.")).toBeInTheDocument();
});
