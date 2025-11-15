import { vi } from "vitest";
vi.mock("@mui/x-data-grid", () => ({
  DataGrid: () => <div data-testid="grid" />,
}));
import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import KleemRatingsPage from "./KleemRatingsPage";

vi.mock("@/features/admin/api/adminKleemRatings", () => ({
  fetchRatings: vi.fn().mockResolvedValue({
    items: [
      {
        id: "1",
        timestamp: "2024-01-01",
        message: "Hello",
        feedback: "good",
        rating: 1,
        sessionId: "s1",
      },
    ],
    total: 1,
  }),
  fetchRatingsStats: vi.fn().mockResolvedValue({
    summary: { totalRated: 1, thumbsUp: 1, thumbsDown: 0, upRate: 1 },
    weekly: [],
    topBad: [],
  }),
}));

test("renders ratings table", async () => {
  renderWithProviders(<KleemRatingsPage />);
  expect(await screen.findByTestId("grid")).toBeInTheDocument();
});
