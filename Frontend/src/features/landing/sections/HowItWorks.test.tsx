import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import HowItWorks from "./HowItWorks";

describe("HowItWorks", () => {
  test("يعرض عنوان قسم كيف يعمل", () => {
    renderWithProviders(<HowItWorks />);
    
    expect(screen.getByText("كيف يعمل كليم في ٤ خطوات سهلة؟")).toBeInTheDocument();
    expect(screen.getByText("من التسجيل إلى بدء العمل خلال أقل من ٢٠ دقيقة")).toBeInTheDocument();
  });

  test("يعرض الخطوات الأربع", () => {
    renderWithProviders(<HowItWorks />);
    
    expect(screen.getByText("إنشاء حساب")).toBeInTheDocument();
    expect(screen.getByText("تهيئة متجرك")).toBeInTheDocument();
    expect(screen.getByText("تهيئة البوت")).toBeInTheDocument();
    expect(screen.getByText("ربط القنوات")).toBeInTheDocument();
  });

  test("يعرض وصف كل خطوة", () => {
    renderWithProviders(<HowItWorks />);
    
    expect(screen.getByText(/سجّل مجانًا وادخل لوحة تحكم كليم الذكية خلال دقيقة واحدة فقط/)).toBeInTheDocument();
    expect(screen.getByText(/اربط متجرك الإلكتروني الحالي/)).toBeInTheDocument();
    expect(screen.getByText(/عرّف كليم على منتجاتك وتعليماتك وأسلوبك في التواصل/)).toBeInTheDocument();
    expect(screen.getByText(/فعّل كليم على قنواتك: واتساب، تيليجرام، دردشة الموقع وغيرها/)).toBeInTheDocument();
  });

  test("يعرض الوقت المتوقع لكل خطوة", () => {
    renderWithProviders(<HowItWorks />);
    
    expect(screen.getByText("دقيقة واحدة")).toBeInTheDocument();
    expect(screen.getByText("٥ دقائق")).toBeInTheDocument();
    expect(screen.getByText("١٠ دقائق")).toBeInTheDocument();
    expect(screen.getByText("٣ دقائق")).toBeInTheDocument();
  });

  test("يحتوي على أيقونات لكل خطوة", () => {
    renderWithProviders(<HowItWorks />);
    
    // التحقق من وجود الأيقونات
    const stepIcons = screen.getAllByTestId(/PersonAddAltIcon|StorefrontIcon|SmartToyIcon|ShareIcon/);
    expect(stepIcons.length).toBeGreaterThan(0);
  });

  test("يعرض أرقام الخطوات", () => {
    renderWithProviders(<HowItWorks />);
    
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  test("يحتوي على شارات المدة", () => {
    renderWithProviders(<HowItWorks />);
    
    // التحقق من وجود أيقونة CheckCircle في شارات المدة
    const checkIcons = screen.getAllByTestId("CheckCircleIcon");
    expect(checkIcons.length).toBeGreaterThan(0);
  });
});
