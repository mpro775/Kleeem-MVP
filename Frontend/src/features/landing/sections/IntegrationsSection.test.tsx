import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import IntegrationsSection from "./IntegrationsSection";

describe("IntegrationsSection", () => {
  test("يعرض عنوان قسم التكاملات", () => {
    renderWithProviders(<IntegrationsSection />);
    
    expect(screen.getByText("تكاملات تمنحك القوة")).toBeInTheDocument();
  });

  test("يعرض شعارات المنصات المدعومة", () => {
    renderWithProviders(<IntegrationsSection />);
    
    expect(screen.getByText("Salla")).toBeInTheDocument();
    expect(screen.getByText("Zid")).toBeInTheDocument();
    expect(screen.getByText("Shopify")).toBeInTheDocument();
    expect(screen.getByText("WooCommerce")).toBeInTheDocument();
  });

  test("يعرض مميزات التكامل", () => {
    renderWithProviders(<IntegrationsSection />);
    
    expect(screen.getByText("مزامنة سلسة للمنتجات، الأسعار، والمخزون مع متجرك.")).toBeInTheDocument();
    expect(screen.getByText("تحديثات فورية للمخزون وبيانات المنتجات تلقائيًا.")).toBeInTheDocument();
    expect(screen.getByText("تكامل عالمي لمتجر إلكتروني احترافي.")).toBeInTheDocument();
    expect(screen.getByText("ربط قوي مع منصة ووردبريس لإدارة أعمالك.")).toBeInTheDocument();
  });

  test("يحتوي على أزرار التنقل", () => {
    renderWithProviders(<IntegrationsSection />);
    
    const prevButton = screen.getByLabelText("السابق");
    const nextButton = screen.getByLabelText("التالي");
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  test("يعرض مؤشرات النقاط للصفحات", () => {
    renderWithProviders(<IntegrationsSection />);
    
    // البحث عن أزرار التنقل بين الصفحات
    const pageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
    expect(pageButtons.length).toBeGreaterThan(0);
  });

  test("يعرض شارة 'قريباً' للمنصات المستقبلية", () => {
    renderWithProviders(<IntegrationsSection />);
    
    // استخدام getAllByText لأن هناك عنصرين "قريبًا"
    const soonLabels = screen.getAllByText("قريبًا");
    expect(soonLabels.length).toBeGreaterThan(0);
  });
});
