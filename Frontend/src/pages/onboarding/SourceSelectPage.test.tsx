import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import SourceSelectPage from "./SourceSelectPage";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { merchantId: "1" }, token: "t" }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("axios", () => ({ get: vi.fn(), patch: vi.fn() }));

vi.mock("@/context/config", () => ({ API_BASE: "" }));

test("shows product source options", () => {
  renderWithProviders(<SourceSelectPage />);
  expect(screen.getByLabelText("كليم (داخلي)")).toBeInTheDocument();
});
