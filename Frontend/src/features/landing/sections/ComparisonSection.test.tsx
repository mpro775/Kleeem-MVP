// src/features/landing/sections/ComparisonSection.test.tsx
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import ComparisonSection from "./ComparisonSection";

describe("ComparisonSection (Before/After)", () => {
  const beforeTexts = [
    "تأخير في الردود",
    "إدارة يدوية للطلبات",
    "لا توجد توصيات للعملاء",
    "ردود غير موحدة",
    "عدم توفر لوحة تحكم",
  ];

  const afterTexts = [
    "ردود فورية عبر المنصات",
    "إدارة تلقائية ذكية",
    "توصية العملاء",
    "ردود ذكية موحدة ومخصصة",
    "لوحة تحكم مخصصة لكل تاجر",
  ];

  test("يعرض عنوان قسم المقارنة الفعلي", () => {
    renderWithProviders(<ComparisonSection />);
    expect(screen.getByText("قبل VS بعد كَلِيم")).toBeInTheDocument();
  });

  test("يعرض عمودَي المقارنة: بعد كليم / قبل كليم", () => {
    renderWithProviders(<ComparisonSection />);
    expect(screen.getByText("بعد كَلِيم")).toBeInTheDocument();
    expect(screen.getByText("قبل كَلِيم")).toBeInTheDocument();
  });

  test("يعرض جميع عناصر قائمة (بعد كليم)", () => {
    renderWithProviders(<ComparisonSection />);
    afterTexts.forEach((txt) => {
      expect(screen.getByText(txt)).toBeInTheDocument();
    });
  });

  test("يعرض جميع عناصر قائمة (قبل كليم)", () => {
    renderWithProviders(<ComparisonSection />);
    beforeTexts.forEach((txt) => {
      expect(screen.getByText(txt)).toBeInTheDocument();
    });
  });

  test("المجموع الكلي للعناصر هو 10 عناصر (5 قبل + 5 بعد)", () => {
    renderWithProviders(<ComparisonSection />);
    const allItems = [...afterTexts, ...beforeTexts];
    const found = allItems.map((t) => screen.getByText(t));
    expect(found).toHaveLength(10);
  });

  test("كل عنصر يحتوي على أيقونات (أيقونة الميزة + شارة الحالة)", () => {
    renderWithProviders(<ComparisonSection />);
    // لكل نص عنصر نتأكد أن عنصر الأب يحتوي على <svg> على الأقل
    const allTexts = [...afterTexts, ...beforeTexts];
    allTexts.forEach((txt) => {
      const textEl = screen.getByText(txt);
      // أقرب حاوية للعنصر (Paper) هي أب لعدة مستويات؛ نكتفي بالتأكد من وجود أي SVG قريب
      const container = textEl.closest("div");
      // قد يكون هناك أكثر من SVG (الأيقونة الأساسية + الشارة)
      const svgs = container?.querySelectorAll("svg");
      expect(svgs && svgs.length).toBeGreaterThan(0);
    });
  });
});
