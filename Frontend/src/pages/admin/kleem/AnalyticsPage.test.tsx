import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import AnalyticsPageAdmin from "./AnalyticsPage";
import { vi } from "vitest";

vi.mock("@/features/admin/api/adminKleem", () => ({
  statsTopQuestions: vi.fn().mockResolvedValue([{ text: "Q1", count: 2 }]),
  statsBadReplies: vi
    .fn()
    .mockResolvedValue([{ text: "Bad", count: 1, feedbacks: ["f1"] }]),
}));

test("renders analytics stats", async () => {
  renderWithProviders(<AnalyticsPageAdmin />);
  expect(await screen.findByText(/Top Questions/i)).toBeInTheDocument();
  expect(await screen.findByText("2 × Q1")).toBeInTheDocument();
  expect(await screen.findByText(/Frequent Bad Bot Replies/i)).toBeInTheDocument();
});
