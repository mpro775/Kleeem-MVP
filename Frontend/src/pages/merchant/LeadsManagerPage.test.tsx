import { screen } from "@testing-library/react";
import LeadsManagerPage from "./LeadsManagerPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/leads/ui/EnabledToggleCard", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/leads/ui/FieldsEditor", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/leads/ui/LeadsTable", () => ({ default: () => <div /> }));

vi.mock("@/features/mechant/leads/hooks", () => ({
  useLeadsManager: () => ({
    loading: false,
    error: null,
    enabled: true,
    fields: [],
    leads: [],
    saving: false,
    saveAll: vi.fn(),
    refreshAll: vi.fn(),
    addField: vi.fn(),
    removeField: vi.fn(),
    updateField: vi.fn(),
    setEnabled: vi.fn(),
  }),
}));

test("renders heading", () => {
  renderWithProviders(<LeadsManagerPage />);
  expect(screen.getByText("إدارة إعدادات الـ Leads")).toBeInTheDocument();
});
