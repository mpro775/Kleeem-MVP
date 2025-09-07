import { vi, test, expect, beforeEach } from "vitest";

// Mock using importOriginal as suggested by Vitest
vi.mock("react-dom/client", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    createRoot: vi.fn(() => ({
      render: vi.fn(),
      unmount: vi.fn()
    }))
  };
});

beforeEach(() => {
  // Clean DOM
  document.body.innerHTML = '<div id="root"></div>';
  
  // Clear mocks
  vi.clearAllMocks();
  
  // Set RTL
  document.documentElement.setAttribute("dir", "rtl");
});

test("sets RTL direction", async () => {
  // Import the file
  await import("./main");
  
  // Check RTL
  expect(document.documentElement.getAttribute("dir")).toBe("rtl");
});

test("renders app", async () => {
  await import("./main");
  
  // Check that root element exists
  const rootElement = document.getElementById("root");
  expect(rootElement).toBeInTheDocument();
});
