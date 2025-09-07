import { screen, fireEvent } from "@testing-library/react";
import CookieConsent from "./CookieConsent";
import { renderWithProviders } from "@/test/test-utils";

test("accepts cookies and saves flag", () => {
  localStorage.removeItem("cookie-ok");
  renderWithProviders(<CookieConsent />);
  expect(screen.getByText(/نستخدم ملفات تعريف الارتباط/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("موافقة"));
  expect(localStorage.getItem("cookie-ok")).toBe("1");
});
