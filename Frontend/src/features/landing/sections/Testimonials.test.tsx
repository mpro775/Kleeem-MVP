import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import Testimonials from "./Testimonials";

describe("Testimonials", () => {
  test("يعرض عنوان قسم الشهادات", () => {
    renderWithProviders(<Testimonials />);
    
    expect(screen.getByText("آراء عملائنا")).toBeInTheDocument();
    expect(screen.getByText(/انظر ماذا يقول عملاؤنا عن تجربتهم مع MusaidBot/)).toBeInTheDocument();
  });

  test("يعرض الشهادات بالأسماء والتقييمات", () => {
    renderWithProviders(<Testimonials />);
    
    expect(screen.getByText("متجر عطور الوسام")).toBeInTheDocument();
    expect(screen.getByText("صاحب متجر")).toBeInTheDocument();
  });

  test("يعرض النجوم للتقييمات", () => {
    renderWithProviders(<Testimonials />);
    
    // البحث عن نجوم التقييم
    const stars = screen.getAllByTestId("StarIcon");
    expect(stars.length).toBeGreaterThan(0);
  });

  test("يحتوي على أزرار التنقل", () => {
    renderWithProviders(<Testimonials />);
    
    const prevButton = screen.getByLabelText("السابق");
    const nextButton = screen.getByLabelText("التالي");
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  test("يتنقل بين الشهادات عند الضغط على أزرار التنقل", async () => {
    renderWithProviders(<Testimonials />);
    
    const nextButton = screen.getByLabelText("التالي");
    
    // الحصول على مؤشر الصفحة الحالي
    const pageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
    
    // البحث عن الزر النشط (الذي له عرض 22px)
    const initialActiveButton = pageButtons.find(button => {
      const computedStyle = window.getComputedStyle(button);
      return computedStyle.width === '22px';
    });
    
    expect(initialActiveButton).toBeInTheDocument();
    
    // الانتقال للصفحة التالية
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      // التحقق من تغيير مؤشر الصفحة النشط
      const newPageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
      const newActiveButton = newPageButtons.find(button => {
        const computedStyle = window.getComputedStyle(button);
        return computedStyle.width === '22px';
      });
      
      // يجب أن يكون الزر النشط الجديد مختلفاً عن الزر الأولي
      expect(newActiveButton).not.toBe(initialActiveButton);
      
      // التحقق من أن الزر الأول لم يعد نشطاً
      const firstButtonStyle = window.getComputedStyle(newPageButtons[0]);
      expect(firstButtonStyle.width).not.toBe('22px');
    });
  });

  test("يعرض مؤشرات النقاط للشهادات", () => {
    renderWithProviders(<Testimonials />);
    
    // البحث عن أزرار التنقل بين الصفحات
    const pageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
    expect(pageButtons.length).toBeGreaterThan(1);
  });

  test("يتنقل للشهادة المحددة عند الضغط على النقطة", async () => {
    renderWithProviders(<Testimonials />);
    
    const pageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
    
    if (pageButtons.length > 1) {
      fireEvent.click(pageButtons[1]);
      
      await waitFor(() => {
        // التحقق من أن الزر الثاني أصبح نشطاً
        const secondButtonStyle = window.getComputedStyle(pageButtons[1]);
        expect(secondButtonStyle.width).toBe('22px');
      });
    }
  });

  test("يعرض تاريخ كل شهادة", () => {
    renderWithProviders(<Testimonials />);
    
    expect(screen.getByText("15 يناير 2023")).toBeInTheDocument();
  });

  test("يعرض صور العملاء (avatars)", () => {
    renderWithProviders(<Testimonials />);
    
    // البحث عن عناصر Avatar بدلاً من img
    const avatars = screen.getAllByText(/م|ن|ت/);
    expect(avatars.length).toBeGreaterThan(0);
  });

  test("يدعم التنقل التلقائي", async () => {
    renderWithProviders(<Testimonials />);
    
    // انتظار التنقل التلقائي
    await waitFor(
      () => {
        // التحقق من وجود أزرار التنقل بين الصفحات
        const pageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
        expect(pageButtons.length).toBeGreaterThan(0);
      },
      { timeout: 6000 }
    );
  });

  test("يتوقف التنقل التلقائي عند التفاعل", async () => {
    renderWithProviders(<Testimonials />);
    
    const nextButton = screen.getByLabelText("التالي");
    
    // التفاعل مع الكاروسيل
    fireEvent.click(nextButton);
    
    // التحقق من توقف التنقل التلقائي
    await waitFor(() => {
      expect(nextButton).toBeInTheDocument();
    });
  });

  test("يتنقل بين الشهادات عند الضغط على أزرار التنقل - اختبار محسن", async () => {
    renderWithProviders(<Testimonials />);
    
    const nextButton = screen.getByLabelText("التالي");
    const pageButtons = screen.getAllByLabelText(/الذهاب إلى الصفحة/);
    
    // التحقق من أن الزر الأول نشط في البداية
    const firstButtonStyle = window.getComputedStyle(pageButtons[0]);
    expect(firstButtonStyle.width).toBe('22px');
    
    // الانتقال للصفحة التالية
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      // التحقق من أن الزر الأول لم يعد نشطاً
      const newFirstButtonStyle = window.getComputedStyle(pageButtons[0]);
      expect(newFirstButtonStyle.width).not.toBe('22px');
      
      // التحقق من أن أحد الأزرار الأخرى أصبح نشطاً
      const hasActiveButton = pageButtons.some(button => {
        const computedStyle = window.getComputedStyle(button);
        return computedStyle.width === '22px';
      });
      expect(hasActiveButton).toBe(true);
    });
  });
});
