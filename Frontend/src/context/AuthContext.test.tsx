import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { vi } from "vitest";
import { BrowserRouter } from "react-router-dom";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Test component to access context
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : "null"}</div>
      <div data-testid="token">{auth.token || "null"}</div>
      <div data-testid="isAuthenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="isAdmin">{auth.isAdmin.toString()}</div>
      <div data-testid="isLoading">{auth.isLoading.toString()}</div>
      <button onClick={() => auth.login({ id: "1", name: "Test", email: "test@test.com", role: "ADMIN", merchantId: null, firstLogin: false, emailVerified: true }, "token123")}>
        Login Admin
      </button>
      <button onClick={() => auth.login({ id: "2", name: "Test Merchant", email: "merchant@test.com", role: "MERCHANT", merchantId: "merchant1", firstLogin: false, emailVerified: true }, "token456")}>
        Login Merchant
      </button>
      <button onClick={() => auth.login({ id: "3", name: "Test Member", email: "member@test.com", role: "MEMBER", merchantId: null, firstLogin: true, emailVerified: false }, "token789")}>
        Login Member
      </button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.updateUser({ name: "Updated Name" })}>Update User</button>
      <button onClick={() => auth.setAuth({ id: "4", name: "Silent", email: "silent@test.com", role: "MERCHANT", merchantId: "merchant2", firstLogin: false, emailVerified: true }, "token999", { silent: true })}>
        Silent Auth
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockNavigate.mockClear();
  });

  test("provides initial state correctly", () => {
    // Arrange & Act
    renderWithProviders(<TestComponent />);

    // Assert
    expect(screen.getByTestId("user")).toHaveTextContent("null");
    expect(screen.getByTestId("token")).toHaveTextContent("null");
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("false");
    expect(screen.getByTestId("isLoading")).toHaveTextContent("true");
  });

  test("loads user and token from localStorage on mount", () => {
    // Arrange
    const mockUser = { id: "1", name: "Test User", email: "test@test.com", role: "ADMIN" as const, merchantId: null, firstLogin: false, emailVerified: true };
    const mockToken = "token123";
    
    localStorageMock.getItem
      .mockReturnValueOnce(mockToken) // token
      .mockReturnValueOnce(JSON.stringify(mockUser)); // user

    // Act
    renderWithProviders(<TestComponent />);

    // Assert
    expect(localStorageMock.getItem).toHaveBeenCalledWith("token");
    expect(localStorageMock.getItem).toHaveBeenCalledWith("user");
    expect(screen.getByTestId("user")).toHaveTextContent(JSON.stringify(mockUser));
    expect(screen.getByTestId("token")).toHaveTextContent(mockToken);
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true");
  });

  test("login function works correctly for ADMIN user", async () => {
    // Arrange
    renderWithProviders(<TestComponent />);
    const loginButton = screen.getByText("Login Admin");

    // Act
    await act(async () => {
      loginButton.click();
    });

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith("token", "token123");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("user", JSON.stringify({
      id: "1", name: "Test", email: "test@test.com", role: "ADMIN", merchantId: null, firstLogin: false, emailVerified: true
    }));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/kleem", { replace: true });
  });

  test("login function works correctly for MERCHANT user", async () => {
    // Arrange
    renderWithProviders(<TestComponent />);
    const loginButton = screen.getByText("Login Merchant");

    // Act
    await act(async () => {
      loginButton.click();
    });

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith("token", "token456");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("user", JSON.stringify({
      id: "2", name: "Test Merchant", email: "merchant@test.com", role: "MERCHANT", merchantId: "merchant1", firstLogin: false, emailVerified: true
    }));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  test("login function works correctly for MEMBER user with first login", async () => {
    // Arrange
    renderWithProviders(<TestComponent />);
    const loginButton = screen.getByText("Login Member");

    // Act
    await act(async () => {
      loginButton.click();
    });

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith("token", "token789");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("user", JSON.stringify({
      id: "3", name: "Test Member", email: "member@test.com", role: "MEMBER", merchantId: null, firstLogin: true, emailVerified: false
    }));
    expect(mockNavigate).toHaveBeenCalledWith("/verify-email", { replace: true });
  });

  test("logout function works correctly", async () => {
    // Arrange
    renderWithProviders(<TestComponent />);
    const logoutButton = screen.getByText("Logout");

    // Act
    await act(async () => {
      logoutButton.click();
    });

    // Assert
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("token");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("user");
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("updateUser function works correctly", async () => {
    // Arrange
    const mockUser = { id: "1", name: "Test User", email: "test@test.com", role: "ADMIN" as const, merchantId: null, firstLogin: false, emailVerified: true };
    localStorageMock.getItem
      .mockReturnValueOnce("token123")
      .mockReturnValueOnce(JSON.stringify(mockUser));
    
    renderWithProviders(<TestComponent />);
    const updateButton = screen.getByText("Update User");

    // Act
    await act(async () => {
      updateButton.click();
    });

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith("user", JSON.stringify({
      ...mockUser,
      name: "Updated Name"
    }));
  });

  test("setAuth with silent option does not navigate", async () => {
    // Arrange
    renderWithProviders(<TestComponent />);
    const silentAuthButton = screen.getByText("Silent Auth");

    // Act
    await act(async () => {
      silentAuthButton.click();
    });

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith("token", "token999");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("user", JSON.stringify({
      id: "4", name: "Silent", email: "silent@test.com", role: "MERCHANT", merchantId: "merchant2", firstLogin: false, emailVerified: true
    }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("hasRole function works correctly for ADMIN user", () => {
    // Arrange
    const mockUser = { id: "1", name: "Test User", email: "test@test.com", role: "ADMIN" as const, merchantId: null, firstLogin: false, emailVerified: true };
    localStorageMock.getItem
      .mockReturnValueOnce("token123")
      .mockReturnValueOnce(JSON.stringify(mockUser));
    
    renderWithProviders(<TestComponent />);

    // Assert
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("true");
  });

  test("hasRole function works correctly for MERCHANT user", () => {
    // Arrange
    const mockUser = { id: "2", name: "Test Merchant", email: "merchant@test.com", role: "MERCHANT" as const, merchantId: "merchant1", firstLogin: false, emailVerified: true };
    localStorageMock.getItem
      .mockReturnValueOnce("token456")
      .mockReturnValueOnce(JSON.stringify(mockUser));
    
    renderWithProviders(<TestComponent />);

    // Assert
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("false");
  });

  test("handles localStorage errors gracefully", () => {
    // Arrange - Mock localStorage to fail on specific calls but not on initial render
    localStorageMock.getItem
      .mockReturnValueOnce(null) // First call for token (succeeds)
      .mockImplementationOnce(() => { // Second call for user (fails)
        throw new Error("localStorage error");
      });

    // Act & Assert - should handle localStorage errors gracefully
    // The component should still render even if localStorage fails for user
    const { container } = renderWithProviders(<TestComponent />);
    expect(container).toBeInTheDocument();
    
    // Should still show initial state even with localStorage errors
    expect(screen.getByTestId("user")).toHaveTextContent("null");
    expect(screen.getByTestId("token")).toHaveTextContent("null");
  });
});
