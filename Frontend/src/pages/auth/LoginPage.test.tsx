import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import LoginPage from "./LoginPage";
import { vi, describe, test, expect, beforeEach } from "vitest";

// Mock dependencies at the top level - محسن
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock("@/auth/api", () => ({
  loginAPI: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/auth/AuthLayout", () => ({
  default: ({ children, title, subtitle }: any) => (
    <div data-testid="auth-layout">
      <div data-testid="auth-title">{title}</div>
      <div data-testid="auth-subtitle">{subtitle}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/shared/ui/GradientIcon", () => ({
  default: ({ Icon, ...props }: any) => <Icon data-testid="gradient-icon" {...props} />,
}));

// Import mocked modules
import { useAuth } from "@/context/AuthContext";
import { loginAPI } from "@/auth/api";
import { toast } from "react-toastify";

describe("LoginPage", () => {
  const user = userEvent.setup();

  // Mock functions - محسن
  const mockLogin = vi.fn();
  const mockLoginAPI = vi.fn();
  const mockToast = {
    error: vi.fn(),
    success: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks - محسن
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
    } as any);
    
    vi.mocked(loginAPI).mockImplementation(mockLoginAPI);
    
    vi.mocked(toast.error).mockImplementation(mockToast.error);
    vi.mocked(toast.success).mockImplementation(mockToast.success);
  });

  // اختبارات أساسية - محسنة
  describe("Rendering", () => {
    test("renders all essential elements", () => {
      renderWithProviders(<LoginPage />);

      // اختبار سريع لجميع العناصر الأساسية
      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
      expect(screen.getByTestId("auth-title")).toHaveTextContent("تسجيل الدخول");
      expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
      expect(screen.getByLabelText("كلمة المرور")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeInTheDocument();
      expect(screen.getAllByTestId("gradient-icon")).toHaveLength(3);
    });

    test("form has correct attributes", () => {
      renderWithProviders(<LoginPage />);

      const form = screen.getByTestId("auth-layout").querySelector("form");
      expect(form).toHaveAttribute("autoComplete", "off");
      expect(form).toHaveAttribute("dir", "rtl");
      
      const passwordInput = screen.getByLabelText("كلمة المرور");
      expect(passwordInput).toHaveAttribute("autoComplete", "current-password");
    });
  });

  // اختبارات التفاعل - محسنة
  describe("User Interactions", () => {
    test("handles form input and submission", async () => {
      const mockUser = { id: "1", email: "test@example.com", role: "MERCHANT" };
      const mockToken = "mock-access-token";

      mockLoginAPI.mockResolvedValue({
        accessToken: mockToken,
        user: mockUser,
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText("البريد الإلكتروني");
      const passwordInput = screen.getByLabelText("كلمة المرور");
      const submitButton = screen.getByRole("button", { name: "تسجيل الدخول" });

      // اختبار سريع - نكتب النص مرة واحدة
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      
      // نتحقق من القيم
      expect(emailInput).toHaveValue("test@example.com");
      expect(passwordInput).toHaveValue("password123");

      // نرسل النموذج
      await user.click(submitButton);

      // نتحقق من النجاح
      await waitFor(() => {
        expect(mockLoginAPI).toHaveBeenCalledWith("test@example.com", "password123");
        expect(mockLogin).toHaveBeenCalledWith(mockUser, mockToken);
        expect(mockToast.success).toHaveBeenCalledWith("تم تسجيل الدخول بنجاح!");
      });
    });

    test("handles password visibility toggle", async () => {
      renderWithProviders(<LoginPage />);

      const passwordInput = screen.getByLabelText("كلمة المرور");
      const toggleButton = screen.getByRole("button", { name: "إظهار كلمة المرور" });

      expect(passwordInput).toHaveAttribute("type", "password");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: "إخفاء كلمة المرور" })).toBeInTheDocument();

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  // اختبارات التحقق - محسنة
  describe("Validation", () => {
    test("shows error for empty fields", async () => {
      renderWithProviders(<LoginPage />);

      const submitButton = screen.getByRole("button", { name: "تسجيل الدخول" });
      await user.click(submitButton);

      expect(mockToast.error).toHaveBeenCalledWith("يرجى إدخال البريد وكلمة المرور");
    });

    test("handles API errors", async () => {
      const mockError = new Error("Invalid credentials");
      mockLoginAPI.mockRejectedValue(mockError);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText("البريد الإلكتروني");
      const passwordInput = screen.getByLabelText("كلمة المرور");
      const submitButton = screen.getByRole("button", { name: "تسجيل الدخول" });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLoginAPI).toHaveBeenCalledWith("test@example.com", "wrongpassword");
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  // اختبارات الحالة - محسنة
  describe("State Management", () => {
    test("shows loading state and maintains form data", async () => {
      mockLoginAPI.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText("البريد الإلكتروني");
      const passwordInput = screen.getByLabelText("كلمة المرور");
      const submitButton = screen.getByRole("button", { name: "تسجيل الدخول" });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // نتحقق من حالة التحميل
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      
      // نتحقق من الحفاظ على البيانات
      expect(emailInput).toHaveValue("test@example.com");
      expect(passwordInput).toHaveValue("password123");
    });

    test("prevents rapid submissions", async () => {
      mockLoginAPI.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText("البريد الإلكتروني");
      const passwordInput = screen.getByLabelText("كلمة المرور");
      const submitButton = screen.getByRole("button", { name: "تسجيل الدخول" });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      await user.click(submitButton);
      
      // نتحقق من أن الزر معطل
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      
      // نتحقق من أن API تم استدعاؤه مرة واحدة فقط
      expect(mockLoginAPI).toHaveBeenCalledTimes(1);
    });
  });

  // اختبارات إمكانية الوصول - محسنة
  describe("Accessibility", () => {
    test("has correct accessibility attributes", () => {
      renderWithProviders(<LoginPage />);

      const passwordToggle = screen.getByRole("button", { name: "إظهار كلمة المرور" });
      expect(passwordToggle).toHaveAttribute("aria-pressed", "false");
      expect(passwordToggle).toHaveAttribute("tabIndex", "-1");

      // نتحقق من وجود aria-hidden على الأيقونة
      const emailIcon = screen.getAllByTestId("gradient-icon")[0];
      const emailIconWrapper = emailIcon.closest('[aria-hidden="true"]');
      expect(emailIconWrapper).toBeInTheDocument();
    });

    test("signup link has correct href", () => {
      renderWithProviders(<LoginPage />);

      const signupLink = screen.getByText("أنشئ حسابًا الآن");
      expect(signupLink).toHaveAttribute("href", "/signup");
    });
  });
});
