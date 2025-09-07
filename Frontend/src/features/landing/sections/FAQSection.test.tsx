// src/features/landing/sections/FAQSection.test.tsx
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import FAQSection from "./FAQSection";

describe("FAQSection", () => {
  const questions = [
    "هل يدعم العربية بالكامل؟",
    "كيف يتم التسعير؟",
    "هل البيانات آمنة؟",
    "هل أستطيع ربط متجري الإلكتروني؟",
    "ما مدى دقة الذكاء الاصطناعي؟",
    "هل يمكنني تخصيص الردود؟",
  ];

  test("يعرض عنوان القسم والوصف", () => {
    renderWithProviders(<FAQSection />);

    expect(screen.getByText("الأسئلة الشائعة")).toBeInTheDocument();
    // شيوعًا/شيوعاً إلخ
    expect(screen.getByText(/إجابات على أكثر الأسئلة شيوع/i)).toBeInTheDocument();
  });

  test("يعرض جميع الأسئلة الموجودة في المكوّن", () => {
    renderWithProviders(<FAQSection />);
    questions.forEach((q) => {
      expect(screen.getByText(q)).toBeInTheDocument();
    });
  });

  test("الأكورديون مطوي افتراضياً (aria-expanded=false لكل الأسئلة)", () => {
    renderWithProviders(<FAQSection />);
    questions.forEach((q) => {
      const btn = screen.getByRole("button", { name: q });
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });
  });

  test("يفتح الأكورديون عند الضغط على السؤال ثم يغلق بالضغط مرة أخرى", () => {
    renderWithProviders(<FAQSection />);

    const firstBtn = screen.getByRole("button", { name: "هل يدعم العربية بالكامل؟" });

    // فتح
    fireEvent.click(firstBtn);
    expect(firstBtn).toHaveAttribute("aria-expanded", "true");
    // (النص موجود أصلًا في DOM حتى وهو مطوي؛ لهذا نتحقق من حالة aria-expanded)

    // إغلاق
    fireEvent.click(firstBtn);
    expect(firstBtn).toHaveAttribute("aria-expanded", "false");
  });

  test("لا يمكن فتح عدة أكورديونات في نفس الوقت (سلوك التوسيع الأحادي)", () => {
    renderWithProviders(<FAQSection />);

    const firstBtn = screen.getByRole("button", { name: "هل يدعم العربية بالكامل؟" });
    const secondBtn = screen.getByRole("button", { name: "كيف يتم التسعير؟" });

    // افتح الأول
    fireEvent.click(firstBtn);
    expect(firstBtn).toHaveAttribute("aria-expanded", "true");
    expect(secondBtn).toHaveAttribute("aria-expanded", "false");

    // افتح الثاني => يجب أن يُغلق الأول تلقائيًا
    fireEvent.click(secondBtn);
    expect(secondBtn).toHaveAttribute("aria-expanded", "true");
    expect(firstBtn).toHaveAttribute("aria-expanded", "false");
  });

  test("يحتوي على أيقونات التوسيع ExpandMoreIcon", () => {
    renderWithProviders(<FAQSection />);
    const expandIcons = screen.getAllByTestId("ExpandMoreIcon");
    expect(expandIcons.length).toBeGreaterThan(0);
  });

  test("يعرض روابط قسم التواصل للمزيد من المساعدة", () => {
    renderWithProviders(<FAQSection />);

    expect(screen.getByText(/لا تجد إجابة لسؤالك؟/)).toBeInTheDocument();
    expect(screen.getByText("تواصل معنا")).toBeInTheDocument();
    expect(screen.getByText("مركز المساعدة")).toBeInTheDocument();
  });

  test("العنصر الرئيسي للقسم موجود (مرجع للتصميم المتجاوب)", () => {
    renderWithProviders(<FAQSection />);
    expect(screen.getByText("الأسئلة الشائعة")).toBeInTheDocument();
  });
});
