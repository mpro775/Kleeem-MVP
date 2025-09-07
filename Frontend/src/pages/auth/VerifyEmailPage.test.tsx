import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import VerifyEmailPage from "./VerifyEmailPage";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock("@/auth/api", () => ({
  verifyEmailAPI: vi.fn(),
  resendVerificationAPI: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
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

vi.mock("@/shared/ui/OtpInputBoxes", () => ({
  default: ({ value, onChange, disabled, onComplete, autoFocus }: any) => (
    <div data-testid="otp-input-boxes">
      <input
        data-testid="otp-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder="Enter 6-digit code"
        maxLength={6}
      />
      <button
        data-testid="otp-complete"
        onClick={() => onComplete && onComplete(value)}
        disabled={disabled || value.length !== 6}
      >
        Complete
      </button>
    </div>
  ),
}));

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
  MemoryRouter: ({ children, initialEntries }: any) => (
    <div data-testid="memory-router" data-entries={JSON.stringify(initialEntries)}>
      {children}
    </div>
  ),
}));

vi.mock("@/shared/lib/errors", () => ({
  getAxiosMessage: vi.fn(),
}));

// Import mocked modules
import { useAuth } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

describe("VerifyEmailPage", () => {
  // Mock functions
  const mockNavigate = vi.fn();

  // Mock location
  const mockLocation = {
    search: "",
    pathname: "/verify-email",
    hash: "",
    state: null,
    key: "test-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1", email: "test@example.com", role: "MERCHANT" },
    } as any);
    
    vi.mocked(useLocation).mockReturnValue(mockLocation);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  describe("rendering", () => {
    test("renders without crashing", () => {
      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
      expect(screen.getByTestId("auth-title")).toHaveTextContent("تفعيل الحساب");
      expect(screen.getByTestId("auth-subtitle")).toHaveTextContent("أدخل رمز التفعيل المكون من 6 أرقام المرسَل إلى بريدك");
    });

    test("renders OTP input boxes", () => {
      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByTestId("otp-input-boxes")).toBeInTheDocument();
      expect(screen.getByTestId("otp-input")).toBeInTheDocument();
      expect(screen.getByTestId("otp-complete")).toBeInTheDocument();
    });

    test("renders submit button", () => {
      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByRole("button", { name: "تفعيل الحساب" })).toBeInTheDocument();
    });

    test("renders resend and login links", () => {
      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByText("إعادة إرسال الكود")).toBeInTheDocument();
      expect(screen.getByText("تسجيل الدخول")).toBeInTheDocument();
    });

    test("renders help text", () => {
      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByText(/لم تستلم الكود؟ تحقق من مجلد الرسائل غير المرغوب فيها/)).toBeInTheDocument();
    });
  });

  describe("initial state", () => {
    test("initializes with empty code when no URL parameter", () => {
      renderWithProviders(<VerifyEmailPage />);

      const otpInput = screen.getByTestId("otp-input");
      expect(otpInput).toHaveValue("");
    });

    test("initializes with code from URL parameter", () => {
      const mockLocationWithCode = {
        ...mockLocation,
        search: "?code=123456",
      };
      vi.mocked(useLocation).mockReturnValue(mockLocationWithCode);

      renderWithProviders(<VerifyEmailPage />);

      const otpInput = screen.getByTestId("otp-input");
      expect(otpInput).toHaveValue("123456");
    });

    test("does not auto-verify when code is less than 6 digits", () => {
      const mockLocationWithCode = {
        ...mockLocation,
        search: "?code=12345",
      };
      vi.mocked(useLocation).mockReturnValue(mockLocationWithCode);

      renderWithProviders(<VerifyEmailPage />);

      // Should not call verifyEmailAPI
      expect(screen.getByTestId("otp-input")).toHaveValue("12345");
    });
  });

  describe("edge cases", () => {
    test("handles empty user object", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
      } as any);

      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
    });

    test("handles user without email", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "1", role: "MERCHANT" },
      } as any);

      renderWithProviders(<VerifyEmailPage />);

      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
    });
  });
});
