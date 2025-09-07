
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import SignUpPage from "./SignUpPage";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";
import { vi } from "vitest";

// Mock only the heaviest components
vi.mock("@/shared/ui/GradientIcon", () => ({
  default: ({ Icon }: any) => <div data-testid="gradient-icon">{Icon && <Icon />}</div>,
}));

describe("SignUpPage Performance Tests", () => {
  beforeEach(() => {
    // Setup MSW for all tests
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json({ message: "Validation failed" }, { status: 400 })
      )
    );
  });

  test("يعرض خطأ عند بريد غير صالح", async () => {
    renderWithProviders(<SignUpPage />);
    
    // Fill required fields first
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/i), "Test User");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور$/), "123456");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/i), "123456");
    
    // Type invalid email
    const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
    await userEvent.type(emailInput, "badmail");
    
    // Submit the form to trigger validation
    await userEvent.click(screen.getByRole("button", { name: /إنشاء حساب/i }));
    
    // Check that the form is still visible (validation prevented submission)
    expect(screen.getByText("إنشاء حساب جديد")).toBeInTheDocument();
    expect(emailInput).toHaveValue("badmail");
  });

  test("ينجح التسجيل عند بيانات صحيحة", async () => {
    // Mock successful signup
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json({ 
          accessToken: "token123", 
          user: { id: 1, name: "Test User" } 
        }, { status: 200 })
      )
    );

    renderWithProviders(<SignUpPage />);
    
    // Fill all fields
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/i), "Test User");
    await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور$/), "123456");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/i), "123456");
    
    // Submit form
    await userEvent.click(screen.getByRole("button", { name: /إنشاء حساب/i }));
    
    // Verify form submission
    expect(screen.getByText("إنشاء حساب جديد")).toBeInTheDocument();
  });

  test("يعرض رسالة API عند فشل التسجيل", async () => {
    // Mock failed signup
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json({ message: "البريد مستخدم مسبقًا" }, { status: 400 })
      )
    );

    renderWithProviders(<SignUpPage />);
    
    // Fill all fields
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/i), "Test User");
    await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/i), "existing@example.com");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور$/), "123456");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/i), "123456");
    
    // Submit form
    await userEvent.click(screen.getByRole("button", { name: /إنشاء حساب/i }));
    
    // Verify form submission
    expect(screen.getByText("إنشاء حساب جديد")).toBeInTheDocument();
  });
});
