import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "./Navbar";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: () => ({ user: null, token: null }),
}));

test("renders nav links and toggles drawer", async () => {
  renderWithProviders(<Navbar />);
  expect(screen.getByText("الرئيسية")).toBeInTheDocument();
  await userEvent.click(screen.getByLabelText("فتح القائمة"));
  expect(screen.getByLabelText("إغلاق")).toBeInTheDocument();
});
