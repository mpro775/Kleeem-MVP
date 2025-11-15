import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import InviteBanner from "./InviteBanner";

describe("InviteBanner", () => {
  test("يعرض العنوان والنص التشجيعي", () => {
    renderWithProviders(<InviteBanner />);

    // أجزاء العنوان المكوّنة من عدة عناصر
    expect(screen.getByText("تخلص")).toBeInTheDocument();
    expect(screen.getByText("استمتع")).toBeInTheDocument();
    expect(screen.getByText(/كَلِيم/)).toBeInTheDocument();

    // الوصف أسفل العنوان
    expect(
      screen.getByText(/قم بترقية تجربة عملائك اليوم ووفر وقتك وجهدك/)
    ).toBeInTheDocument();
  });

  test("يحتوي على زر الدعوة للعمل", () => {
    renderWithProviders(<InviteBanner />);
    expect(
      screen.getByRole("button", { name: "ابدأ المحادثة الآن" })
    ).toBeInTheDocument();
  });
});
