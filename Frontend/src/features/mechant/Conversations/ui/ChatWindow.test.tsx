import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ChatWindow from "./ChatWindow";

test("يعرض رسالة فارغة عند عدم وجود رسائل", () => {
  renderWithProviders(<ChatWindow messages={[]} loading={false} />);
  expect(screen.getByText(/لا يوجد رسائل/)).toBeInTheDocument();
});
