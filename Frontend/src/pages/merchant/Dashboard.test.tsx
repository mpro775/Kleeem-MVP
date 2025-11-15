import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import Dashboard from "./Dashboard";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});
vi.mock("@/features/mechant/analytics/model", () => ({
  useOverview: () => ({ data: { sessions: { count: 5 }, messages: 2, productsCount: 3 }, isLoading: false, error: null, refetch: vi.fn() }),
  useChecklist: () => ({ data: [], isLoading: false, error: null }),
  useMessagesTimeline: () => ({ data: [], isLoading: false }),
  useProductsCount: () => ({ data: 3 }),
  useSkipChecklist: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/shared/hooks/useStoreServicesFlag", () => ({ useStoreServicesFlag: () => true }));
vi.mock("@/features/mechant/dashboard/ui/ChecklistPanel", () => ({ default: () => <div data-testid="checklist" /> }));
vi.mock("@/features/mechant/dashboard/ui/DashboardAdvice", () => ({ default: () => <div data-testid="advice" /> }));
vi.mock("@/features/mechant/dashboard/ui/ProductsChart", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/dashboard/ui/KeywordsChart", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/dashboard/ui/ChannelsPieChart", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/dashboard/ui/MessagesTimelineChart", () => ({ default: () => <div /> }));


test("renders dashboard data", () => {
  renderWithProviders(<Dashboard />);
  expect(screen.getByTestId("checklist")).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
});
