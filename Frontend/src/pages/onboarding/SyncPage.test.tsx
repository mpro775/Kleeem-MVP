import { screen, fireEvent, waitFor } from "@testing-library/react";
import SyncPage from "./SyncPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { merchantId: "m1" }, token: "t" }),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig();
  return { ...(actual as object), useNavigate: () => vi.fn() };
});
vi.mock("@/features/integtarions/api/integrationsApi", () => ({
  getIntegrationsStatus: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/features/integtarions/api/catalogApi", () => ({
  syncCatalog: vi.fn().mockResolvedValue({ imported: 1, updated: 2 }),
}));
vi.mock("@/auth/AuthLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));

import { syncCatalog } from "@/features/integtarions/api/catalogApi";

test("initial status", () => {
  renderWithProviders(<SyncPage />);
  expect(screen.getByText("جاهز للمزامنة")).toBeInTheDocument();
});

test("sync button triggers catalog sync", async () => {
  renderWithProviders(<SyncPage />);
  fireEvent.click(screen.getByText("مزامنة الآن"));
  await waitFor(() => expect(syncCatalog).toHaveBeenCalled());
  await waitFor(() =>
    expect(screen.getByText("اكتملت المزامنة!")).toBeInTheDocument()
  );
});
