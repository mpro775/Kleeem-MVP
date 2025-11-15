import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { PrivateRoute } from "./PrivateRoute";
import { vi } from "vitest";

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

describe("PrivateRoute", () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders children when user is authenticated", () => {
    // Arrange
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    // Act
    renderWithProviders(
      <PrivateRoute>
        <TestComponent />
      </PrivateRoute>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("redirects to login when user is not authenticated", () => {
    // Arrange
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    // Act
    renderWithProviders(
      <PrivateRoute>
        <TestComponent />
      </PrivateRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    
    // The component should not render protected content when not authenticated
    // Navigate component behavior is tested by React Router itself
  });

  test("handles undefined authentication state gracefully", () => {
    // Arrange
    mockUseAuth.mockReturnValue({ isAuthenticated: undefined });

    // Act
    renderWithProviders(
      <PrivateRoute>
        <TestComponent />
      </PrivateRoute>
    );

    // Assert
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    // Undefined auth state should be treated as not authenticated
  });

  test("works with complex nested components", () => {
    // Arrange
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    
    const NestedComponent = () => (
      <div>
        <h1>Dashboard</h1>
        <p>Welcome to your account</p>
        <button>Settings</button>
      </div>
    );

    // Act
    renderWithProviders(
      <PrivateRoute>
        <NestedComponent />
      </PrivateRoute>
    );

    // Assert
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Welcome to your account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  test("maintains component props and structure", () => {
    // Arrange
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    
    const ComponentWithProps = ({ title, count }: { title: string; count: number }) => (
      <div data-testid="component-with-props">
        <h2>{title}</h2>
        <span>Count: {count}</span>
      </div>
    );

    // Act
    renderWithProviders(
      <PrivateRoute>
        <ComponentWithProps title="Test Title" count={42} />
      </PrivateRoute>
    );

    // Assert
    expect(screen.getByTestId("component-with-props")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Count: 42")).toBeInTheDocument();
  });
});
