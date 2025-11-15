import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import RoleRoute from "./RoleRoute";
import { vi } from "vitest";

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

describe("RoleRoute", () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders children when user has ADMIN role and it's allowed", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "ADMIN" }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN", "MERCHANT"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("renders children when user has MERCHANT role and it's allowed", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "MERCHANT" }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN", "MERCHANT"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("renders children when user has MEMBER role and it's allowed", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "MEMBER" }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["MEMBER"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("redirects to login when user is not authenticated", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  test("redirects to home when user role is not in allowed list", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "MEMBER" }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN", "MERCHANT"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  test("redirects to home when user object is null", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: null
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  test("redirects to home when user role is undefined", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: undefined }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  test("works with multiple allowed roles", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "MERCHANT" }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN", "MERCHANT", "MEMBER"]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("maintains component props and structure", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "ADMIN" }
    });
    
    const ComponentWithProps = ({ title, count }: { title: string; count: number }) => (
      <div data-testid="component-with-props">
        <h2>{title}</h2>
        <span>Count: {count}</span>
      </div>
    );

    // Act
    renderWithProviders(
      <RoleRoute allow={["ADMIN"]}>
        <ComponentWithProps title="Admin Dashboard" count={100} />
      </RoleRoute>
    );

    // Assert
    expect(screen.getByTestId("component-with-props")).toBeInTheDocument();
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Count: 100")).toBeInTheDocument();
  });

  test("handles edge case with empty allow array", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "ADMIN" }
    });

    // Act
    renderWithProviders(
      <RoleRoute allow={[]}>
        <TestComponent />
      </RoleRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
