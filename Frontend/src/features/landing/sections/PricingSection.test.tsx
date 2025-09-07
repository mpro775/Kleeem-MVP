import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import PricingSection from "./PricingSection";

describe("PricingSection", () => {
  test("يعرض عنوان القسم والوصف", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("خطط الأسعار المناسبة لك")).toBeInTheDocument();
    expect(screen.getByText(/اختر الباقة التي تناسب احتياجات عملك مع خصم يصل إلى 20%/)).toBeInTheDocument();
  });

  test("يعرض مفتاح التبديل بين الشهرية والسنوية", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("شهري")).toBeInTheDocument();
    expect(screen.getByText("سنوي (وفر 20%)")).toBeInTheDocument();
  });

  test("يعرض الخطط الشهرية افتراضياً", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("البداية")).toBeInTheDocument();
    expect(screen.getByText("المحترف")).toBeInTheDocument();
    expect(screen.getByText("الشركات")).toBeInTheDocument();
  });

  test("يتبدل إلى الخطط السنوية عند الضغط على المفتاح", () => {
    renderWithProviders(<PricingSection />);
    
    const yearlyToggle = screen.getByText("سنوي (وفر 20%)");
    fireEvent.click(yearlyToggle);
    
    // التحقق من تغيير الأسعار (الأسعار السنوية أقل)
    expect(screen.getByText(/79/)).toBeInTheDocument(); // سعر البداية السنوي
  });

  test("يعرض علامة 'الأكثر شعبية' على الخطة الشائعة", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("الأكثر شعبية")).toBeInTheDocument();
  });

  test("يعرض ميزات كل خطة", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("ردود آلية غير محدودة")).toBeInTheDocument();
    expect(screen.getByText("دعم فني عبر البريد الإلكتروني")).toBeInTheDocument();
    expect(screen.getByText("إحصائيات أساسية")).toBeInTheDocument();
  });

  test("يحتوي على أزرار 'اختر الباقة' لكل خطة", () => {
    renderWithProviders(<PricingSection />);
    
    const startButtons = screen.getAllByText("اختر الباقة");
    expect(startButtons).toHaveLength(3); // ثلاث خطط
  });

  test("يعرض ميزات الخطة الشائعة", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("تكامل مع أنظمة الدفع")).toBeInTheDocument();
    expect(screen.getByText("دعم فني على مدار الساعة")).toBeInTheDocument();
  });

  test("يعرض ميزات خطة الشركات", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("حلول مخصصة")).toBeInTheDocument();
    expect(screen.getByText("مدير مخصص")).toBeInTheDocument();
    expect(screen.getByText("أولوية في الدعم الفني")).toBeInTheDocument();
  });

  test("يعرض الأسعار بالدولار", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("$99")).toBeInTheDocument();
    expect(screen.getByText("$199")).toBeInTheDocument();
    expect(screen.getByText("$399")).toBeInTheDocument();
  });

  test("يعرض وصف كل خطة", () => {
    renderWithProviders(<PricingSection />);
    
    expect(screen.getByText("ابدأ رحلتك مع الذكاء الاصطناعي")).toBeInTheDocument();
    expect(screen.getByText("أدوات متقدمة لنمو متجرك")).toBeInTheDocument();
    expect(screen.getByText("حلول مخصصة للشركات الكبرى")).toBeInTheDocument();
  });
});
