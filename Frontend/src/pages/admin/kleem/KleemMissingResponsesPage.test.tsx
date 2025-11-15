import { vi } from "vitest";
vi.mock("@mui/x-data-grid", () => ({
  DataGrid: () => <div data-testid="grid" />,
}));
import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import KleemMissingResponsesPage from "./KleemMissingResponsesPage";

vi.mock("../../../features/admin/api/adminAnalytics", () => ({
  fetchKleemList: vi.fn().mockResolvedValue({
    items: [
      {
        _id: "1",
        createdAt: "2024-01-01",
        channel: "telegram",
        question: "Q?",
        botReply: "R",
        aiAnalysis: "",
        manualReply: "",
        resolved: false,
      },
    ],
    total: 1,
  }),
  updateKleem: vi.fn(),
  bulkResolve: vi.fn(),
}));

test("loads kleem items", async () => {
  renderWithProviders(<KleemMissingResponsesPage />);
  expect(await screen.findByTestId("grid")).toBeInTheDocument();
});
