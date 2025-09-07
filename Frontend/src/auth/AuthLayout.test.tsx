import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import AuthLayout from "./AuthLayout";
import { vi } from "vitest";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock image assets
vi.mock("@/assets/logo.png", () => ({
  default: "mock-logo.png",
}));

vi.mock("@/assets/bg-shape.png", () => ({
  default: "mock-bg-shape.png",
}));

describe("AuthLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders without crashing", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    );
    
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  test("renders children correctly", () => {
    const testContent = "This is test content";
    renderWithProviders(
      <AuthLayout>
        <div data-testid="test-content">{testContent}</div>
      </AuthLayout>
    );
    
    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  test("renders title when provided", () => {
    const testTitle = "Test Title";
    renderWithProviders(
      <AuthLayout title={<h1>{testTitle}</h1>}>
        <div>Content</div>
      </AuthLayout>
    );
    
    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  test("renders subtitle when provided", () => {
    const testSubtitle = "Test Subtitle";
    renderWithProviders(
      <AuthLayout subtitle={<p>{testSubtitle}</p>}>
        <div>Content</div>
      </AuthLayout>
    );
    
    expect(screen.getByText(testSubtitle)).toBeInTheDocument();
  });

  test("renders both title and subtitle when provided", () => {
    const testTitle = "Main Title";
    const testSubtitle = "Subtitle Text";
    
    renderWithProviders(
      <AuthLayout 
        title={<h1>{testTitle}</h1>}
        subtitle={<p>{testSubtitle}</p>}
      >
        <div>Content</div>
      </AuthLayout>
    );
    
    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByText(testSubtitle)).toBeInTheDocument();
  });

  test("renders logo image", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );
    
    const logoImage = screen.getByAltText("Kleem");
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute("src", "mock-logo.png");
  });

  test("renders background decoration images", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );
    
    // Should have 2 background decoration images
    const bgImages = screen.getAllByAltText("");
    expect(bgImages).toHaveLength(2);
    
    bgImages.forEach(img => {
      expect(img).toHaveAttribute("src", "mock-bg-shape.png");
      expect(img).toHaveAttribute("aria-hidden");
    });
  });

  test("applies default maxWidth prop", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );
    
    // Default maxWidth should be "sm"
    // We can't easily test MUI Container props directly, but we can ensure the component renders
    expect(container.firstChild).toBeInTheDocument();
  });

  test("applies custom maxWidth prop", () => {
    const { container } = renderWithProviders(
      <AuthLayout maxWidth="xs">
        <div>Content</div>
      </AuthLayout>
    );
    
    // Component should render with custom maxWidth
    expect(container.firstChild).toBeInTheDocument();
  });

  test("handles different maxWidth values", () => {
    const maxWidthValues: Array<"xs" | "sm" | "md"> = ["xs", "sm", "md"];
    
    maxWidthValues.forEach(maxWidth => {
      const { container } = renderWithProviders(
        <AuthLayout maxWidth={maxWidth}>
          <div data-testid={`content-${maxWidth}`}>Content for {maxWidth}</div>
        </AuthLayout>
      );
      
      expect(screen.getByTestId(`content-${maxWidth}`)).toBeInTheDocument();
    });
  });

  test("maintains proper component structure", () => {
    renderWithProviders(
      <AuthLayout
        title={<h1>Title</h1>}
        subtitle={<p>Subtitle</p>}
      >
        <div data-testid="main-content">Main Content</div>
      </AuthLayout>
    );
    
    // Check that all parts are rendered
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
    expect(screen.getByAltText("Kleem")).toBeInTheDocument();
  });

  test("handles empty title and subtitle gracefully", () => {
    renderWithProviders(
      <AuthLayout title={null} subtitle={undefined}>
        <div>Content</div>
      </AuthLayout>
    );
    
    // Should still render content and logo
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByAltText("Kleem")).toBeInTheDocument();
  });

  test("renders complex children components", () => {
    const ComplexChild = () => (
      <div>
        <h2>Complex Child</h2>
        <form>
          <input type="text" placeholder="Username" />
          <button type="submit">Submit</button>
        </form>
      </div>
    );
    
    renderWithProviders(
      <AuthLayout>
        <ComplexChild />
      </AuthLayout>
    );
    
    expect(screen.getByText("Complex Child")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  test("maintains responsive layout structure", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Responsive Content</div>
      </AuthLayout>
    );
    
    // Should render without layout issues
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText("Responsive Content")).toBeInTheDocument();
  });

  test("handles theme integration", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Themed Content</div>
      </AuthLayout>
    );
    
    // Should render with theme applied (we can't test styles directly but ensure no crashes)
    expect(screen.getByText("Themed Content")).toBeInTheDocument();
  });

  test("supports React fragments as children", () => {
    renderWithProviders(
      <AuthLayout>
        <>
          <div>Fragment Child 1</div>
          <div>Fragment Child 2</div>
        </>
      </AuthLayout>
    );
    
    expect(screen.getByText("Fragment Child 1")).toBeInTheDocument();
    expect(screen.getByText("Fragment Child 2")).toBeInTheDocument();
  });
});
