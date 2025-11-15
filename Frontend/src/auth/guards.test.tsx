import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { RequireAuth, RequireRole } from "./guards";
import { vi } from "vitest";

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

describe("Auth Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RequireAuth", () => {
    const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

    test("renders children when user is authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "test@example.com", role: "MERCHANT" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    test("redirects to login when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderWithProviders(
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    test("returns null when loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      const { container } = renderWithProviders(
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
      // The guard component should not render children when loading
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    test("handles user with different roles", () => {
      const roles = ["ADMIN", "MERCHANT", "MEMBER"];
      
      roles.forEach(role => {
        mockUseAuth.mockReturnValue({
          user: { id: "1", email: "test@example.com", role },
          isLoading: false,
        });

        renderWithProviders(
          <RequireAuth>
            <TestComponent />
          </RequireAuth>
        );

        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
        
        // Clean up for next iteration
        screen.getByTestId("protected-content").remove();
      });
    });

    test("handles undefined user", () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
      });

      renderWithProviders(
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    test("handles complex child components", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "test@example.com", role: "ADMIN" },
        isLoading: false,
      });

      const ComplexChild = () => (
        <div data-testid="complex-content">
          <h1>Protected Page</h1>
          <form>
            <input type="text" placeholder="Username" />
            <button type="submit">Submit</button>
          </form>
        </div>
      );

      renderWithProviders(
        <RequireAuth>
          <ComplexChild />
        </RequireAuth>
      );

      expect(screen.getByTestId("complex-content")).toBeInTheDocument();
      expect(screen.getByText("Protected Page")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });
  });

  describe("RequireRole", () => {
    const TestComponent = () => <div data-testid="role-protected-content">Role Protected Content</div>;

    test("renders children when user has ADMIN role and ADMIN is required", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "admin@example.com", role: "ADMIN" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="ADMIN">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.getByTestId("role-protected-content")).toBeInTheDocument();
    });

    test("renders children when user has MERCHANT role and MERCHANT is required", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "merchant@example.com", role: "MERCHANT" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="MERCHANT">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.getByTestId("role-protected-content")).toBeInTheDocument();
    });

    test("renders children when user has MEMBER role and MEMBER is required", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "member@example.com", role: "MEMBER" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="MEMBER">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.getByTestId("role-protected-content")).toBeInTheDocument();
    });

    test("redirects to home when user has MERCHANT role but ADMIN is required", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "merchant@example.com", role: "MERCHANT" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="ADMIN">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
    });

    test("redirects to home when user has MEMBER role but ADMIN is required", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "member@example.com", role: "MEMBER" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="ADMIN">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
    });

    test("redirects to login when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="ADMIN">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
    });

    test("returns null when loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      const { container } = renderWithProviders(
        <RequireRole role="ADMIN">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
      // The guard component should not render children when loading
      expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
    });

    test("handles role mismatch scenarios", () => {
      const scenarios = [
        { userRole: "ADMIN", requiredRole: "MERCHANT", shouldRender: false },
        { userRole: "ADMIN", requiredRole: "MEMBER", shouldRender: false },
        { userRole: "MERCHANT", requiredRole: "ADMIN", shouldRender: false },
        { userRole: "MERCHANT", requiredRole: "MEMBER", shouldRender: false },
        { userRole: "MEMBER", requiredRole: "ADMIN", shouldRender: false },
        { userRole: "MEMBER", requiredRole: "MERCHANT", shouldRender: false },
      ];

      scenarios.forEach(({ userRole, requiredRole, shouldRender }) => {
        mockUseAuth.mockReturnValue({
          user: { id: "1", email: "test@example.com", role: userRole },
          isLoading: false,
        });

        renderWithProviders(
          <RequireRole role={requiredRole as "ADMIN" | "MERCHANT" | "MEMBER"}>
            <TestComponent />
          </RequireRole>
        );

        if (shouldRender) {
          expect(screen.getByTestId("role-protected-content")).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
        }

        // Clean up for next iteration
        const content = screen.queryByTestId("role-protected-content");
        if (content) content.remove();
      });
    });

    test("handles user with undefined role", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "test@example.com", role: undefined },
        isLoading: false,
      });

      renderWithProviders(
        <RequireRole role="ADMIN">
          <TestComponent />
        </RequireRole>
      );

      expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
    });

    test("handles all role combinations correctly", () => {
      const roles: Array<"ADMIN" | "MERCHANT" | "MEMBER"> = ["ADMIN", "MERCHANT", "MEMBER"];
      
      roles.forEach(userRole => {
        roles.forEach(requiredRole => {
          mockUseAuth.mockReturnValue({
            user: { id: "1", email: "test@example.com", role: userRole },
            isLoading: false,
          });

          renderWithProviders(
            <RequireRole role={requiredRole}>
              <TestComponent />
            </RequireRole>
          );

          if (userRole === requiredRole) {
            expect(screen.getByTestId("role-protected-content")).toBeInTheDocument();
          } else {
            expect(screen.queryByTestId("role-protected-content")).not.toBeInTheDocument();
          }

          // Clean up for next iteration
          const content = screen.queryByTestId("role-protected-content");
          if (content) content.remove();
        });
      });
    });
  });

  describe("Integration Tests", () => {
    const TestComponent = () => <div data-testid="integrated-content">Integrated Content</div>;

    test("RequireAuth and RequireRole work together", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "admin@example.com", role: "ADMIN" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireAuth>
          <RequireRole role="ADMIN">
            <TestComponent />
          </RequireRole>
        </RequireAuth>
      );

      expect(screen.getByTestId("integrated-content")).toBeInTheDocument();
    });

    test("nested guards handle unauthenticated user", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderWithProviders(
        <RequireAuth>
          <RequireRole role="ADMIN">
            <TestComponent />
          </RequireRole>
        </RequireAuth>
      );

      expect(screen.queryByTestId("integrated-content")).not.toBeInTheDocument();
    });

    test("nested guards handle role mismatch", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "merchant@example.com", role: "MERCHANT" },
        isLoading: false,
      });

      renderWithProviders(
        <RequireAuth>
          <RequireRole role="ADMIN">
            <TestComponent />
          </RequireRole>
        </RequireAuth>
      );

      expect(screen.queryByTestId("integrated-content")).not.toBeInTheDocument();
    });
  });
});
