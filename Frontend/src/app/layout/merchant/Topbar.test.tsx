import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import Topbar from "./Topbar";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { storeName: "Test Store" }, logout: vi.fn() }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

test("renders store name", () => {
  renderWithProviders(
    <Topbar onOpenSidebar={() => {}} isMobile={false} />,
    { route: "/dashboard" }
  );
  expect(screen.getByText("Test Store")).toBeInTheDocument();
});
