import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ConversationsList from "./ConversationsList";

test("يعرض رسالة عدم وجود محادثات", () => {
  renderWithProviders(<ConversationsList sessions={[]} loading={false} onSelect={() => {}} />);
  expect(screen.getByText(/لا توجد محادثات حتى الآن/)).toBeInTheDocument();
});
