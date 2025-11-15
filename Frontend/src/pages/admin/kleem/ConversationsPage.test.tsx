import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ConversationsKleemPage from "./ConversationsPage";
import { vi } from "vitest";

vi.mock("@/features/admin/api/adminKleem", () => ({
  listSessions: vi.fn().mockResolvedValue({
    data: [
      { sessionId: "s1", messages: [{ text: "hello" }, { text: "bye" }] },
    ],
    total: 1,
  }),
}));

test("shows sessions table", async () => {
  renderWithProviders(<ConversationsKleemPage />);
  expect(await screen.findByText("s1")).toBeInTheDocument();
});
