import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import StorefrontSection from "./StorefrontSection";

describe("StorefrontSection", () => {
  test("يعرض عنوان قسم واجهة المتجر", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("متجر كليم المصغّر")).toBeInTheDocument();
    expect(screen.getByText(/لو ما عندك متجر في سلة أو زد/)).toBeInTheDocument();
  });

  test("يعرض الشريحة التعريفية", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("ميزة أساسية")).toBeInTheDocument();
  });

  test("يعرض معاينة لواجهة المتجر", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("معاينة المتجر")).toBeInTheDocument();
    expect(screen.getByText("ضع هنا Screenshot لواجهة متجرك")).toBeInTheDocument();
  });

  test("يحتوي على أزرار العمل", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("أنشئ متجرك الآن")).toBeInTheDocument();
    expect(screen.getByText("شاهد مثال مباشر")).toBeInTheDocument();
  });

  test("يعرض مميزات المتجر في الحبوب", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("جاهز خلال دقائق")).toBeInTheDocument();
    expect(screen.getAllByText("سلة مبسّطة")).toHaveLength(2); // موجود في مكانين
    expect(screen.getByText("محادثات مدمجة")).toBeInTheDocument();
    expect(screen.getByText("نطاق مخصص")).toBeInTheDocument();
  });

  test("يعرض قسم لماذا المتجر المصغّر", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("لماذا المتجر المصغّر؟")).toBeInTheDocument();
    expect(screen.getByText(/مناسب للبدايات السريعة والبيع عبر المحادثات/)).toBeInTheDocument();
  });

  test("يعرض الميزات التفصيلية", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("سلة شراء وخطوات طلب مبسّطة")).toBeInTheDocument();
    expect(screen.getByText(/رابط فوري.*kleem.store أو نطاقك المخصص/)).toBeInTheDocument();
    expect(screen.getByText("هوية بصرية: شعار + ألوان + شكل الأزرار")).toBeInTheDocument();
  });

  test("يحتوي على قسم كيف يعمل", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("كيف يعمل؟")).toBeInTheDocument();
    expect(screen.getByText(/فعّل المتجر من لوحة التحكم/)).toBeInTheDocument();
  });

  test("يحتوي على أزرار إضافية في قسم كيف يعمل", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("ابدأ الآن")).toBeInTheDocument();
    expect(screen.getByText("استعرض الديمو")).toBeInTheDocument();
  });

  test("يعرض الحبوب الصغيرة للميزات", () => {
    renderWithProviders(<StorefrontSection />);
    
    expect(screen.getByText("ألوان وشعار")).toBeInTheDocument();
    expect(screen.getByText("واتساب/تيليجرام")).toBeInTheDocument();
    expect(screen.getByText("رابط فوري")).toBeInTheDocument();
  });
});
