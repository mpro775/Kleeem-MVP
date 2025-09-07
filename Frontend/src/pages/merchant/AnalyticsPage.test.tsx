import { screen } from "@testing-library/react";
import AnalyticsPage from "./AnalyticsPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/shared/api/axios", () => ({ get: vi.fn(() => Promise.reject(new Error("err"))) }));

vi.mock("@/shared/hooks/useStoreServicesFlag", () => ({ useStoreServicesFlag: () => false }));

vi.mock("@/features/mechant/dashboard/ui/MessagesTimelineChart", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/dashboard/ui/ProductsChart", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/dashboard/ui/KeywordsChart", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/dashboard/ui/ChannelsPieChart", () => ({ default: () => <div /> }));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />, XAxis: () => <div />, YAxis: () => <div />, CartesianGrid: () => <div />,
  Tooltip: () => <div />, Legend: () => <div />,
}));

test("shows loading indicator", () => {
  renderWithProviders(<AnalyticsPage />);
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
});
