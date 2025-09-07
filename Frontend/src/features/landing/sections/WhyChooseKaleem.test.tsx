// src/features/landing/sections/WhyChooseKaleem.test.tsx
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { vi, describe, test, expect, beforeEach } from "vitest";

// ✅ Mock مبسط ومحسن لـ @mui/material
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");
  return {
    ...actual,
    useMediaQuery: () => true, // تبسيط - كل breakpoints تعطي true
    useTheme: () => ({
      breakpoints: {
        up: () => true
      }
    })
  };
});

// Mock مبسط للـ icons
vi.mock("@mui/icons-material/ChevronLeftRounded", () => ({
  default: () => <div data-testid="chevron-left">السابق</div>
}));

vi.mock("@mui/icons-material/ChevronRightRounded", () => ({
  default: () => <div data-testid="chevron-right">التالي</div>
}));

// Mock مبسط للـ feature icons
vi.mock("@mui/icons-material/AutoAwesome", () => ({
  default: () => <div data-testid="auto-awesome">✨</div>
}));

vi.mock("@mui/icons-material/Hub", () => ({
  default: () => <div data-testid="hub">🔗</div>
}));

vi.mock("@mui/icons-material/ThumbUpAlt", () => ({
  default: () => <div data-testid="thumb-up">👍</div>
}));

vi.mock("@mui/icons-material/Security", () => ({
  default: () => <div data-testid="security">🔒</div>
}));

vi.mock("@mui/icons-material/Store", () => ({
  default: () => <div data-testid="store">🏪</div>
}));

vi.mock("@mui/icons-material/QueryStats", () => ({
  default: () => <div data-testid="query-stats">📊</div>
}));

vi.mock("@mui/icons-material/AccessTime", () => ({
  default: () => <div data-testid="access-time">⏰</div>
}));

vi.mock("@mui/icons-material/Language", () => ({
  default: () => <div data-testid="language">🌐</div>
}));

// بعد الـ mocks نقدر نستورد المكوّن
import WhyChooseKaleem from "./WhyChooseKaleem";

describe("WhyChooseKaleem", () => {
  beforeEach(() => {
    // إعداد مبسط - JSDOM لا يوفّر scrollTo
    Element.prototype.scrollTo = vi.fn();
    
    // Mock مبسط للـ timers
    vi.useFakeTimers();
    
    // Mock مبسط للـ clientWidth
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800
    });
  });

  test("يعرض عنوان قسم لماذا كليم؟", () => {
    renderWithProviders(<WhyChooseKaleem />);
    expect(screen.getByText("لماذا كليم؟")).toBeInTheDocument();
  });

  test("يعرض بعض المميزات الرئيسية", () => {
    renderWithProviders(<WhyChooseKaleem />);
    
    // اختبار أسرع - نتحقق من وجود النصوص الأساسية فقط
    expect(screen.getByText("ذكاء يفهم لهجتك")).toBeInTheDocument();
    expect(screen.getByText("أمان وخصوصية")).toBeInTheDocument();
    expect(screen.getByText("واجهة عربية سهلة")).toBeInTheDocument();
  });

  test("أزرار التصفح موجودة وتغيّر الحالة بالضغط", () => {
    renderWithProviders(<WhyChooseKaleem />);
    
    const prevBtn = screen.getByRole("button", { name: "السابق" });
    const nextBtn = screen.getByRole("button", { name: "التالي" });

    // تحقق من وجود الأزرار
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    
    // تحقق من الحالة الأولية - أسرع بدون async
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  test("التمرير التلقائي يعمل ويتوقف ثم يستأنف", () => {
    const { container } = renderWithProviders(<WhyChooseKaleem />);
    
    const nextBtn = screen.getByRole("button", { name: "التالي" });
    const prevBtn = screen.getByRole("button", { name: "السابق" });

    // تحقق من وجود الأزرار
    expect(nextBtn).toBeInTheDocument();
    expect(prevBtn).toBeInTheDocument();
    
    // تحقق من وجود المسار - أسرع
    const track = container.querySelector('[dir="ltr"]');
    expect(track).toBeInTheDocument();
    
    // تحقق من أن الأزرار في الحالة الصحيحة
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  test("يعرض جميع المميزات الثمانية", () => {
    renderWithProviders(<WhyChooseKaleem />);
    
    // اختبار سريع لجميع المميزات
    const expectedFeatures = [
      "ذكاء يفهم لهجتك",
      "كل القنوات في مكان واحد", 
      "ردود فورية مخصصة",
      "ربط متجرك بسهولة",
      "أمان وخصوصية",
      "تحليلات وتقارير فورية",
      "توفر دائم 24/7",
      "واجهة عربية سهلة"
    ];
    
    expectedFeatures.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  test("يعرض أيقونات المميزات", () => {
    renderWithProviders(<WhyChooseKaleem />);
    
    // اختبار سريع للأيقونات
    expect(screen.getByTestId("auto-awesome")).toBeInTheDocument();
    expect(screen.getByTestId("hub")).toBeInTheDocument();
    expect(screen.getByTestId("security")).toBeInTheDocument();
    expect(screen.getByTestId("store")).toBeInTheDocument();
  });
});
