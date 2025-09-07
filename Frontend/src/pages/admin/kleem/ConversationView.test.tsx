import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import ConversationView from "./ConversationView";
import { vi } from "vitest";

vi.mock("@/features/admin/api/adminKleem", () => ({
  getSession: vi.fn().mockResolvedValue({
    sessionId: "abc",
    messages: [
      { role: "user", text: "hello" },
      { role: "bot", text: "hi" },
    ],
  }),
}));

test("renders conversation messages", async () => {
  renderWithProviders(
    <Routes>
      <Route path="/admin/kleem/conversations/:sessionId" element={<ConversationView />} />
    </Routes>,
    { route: "/admin/kleem/conversations/abc" }
  );
  expect(await screen.findByText(/Session: abc/)).toBeInTheDocument();
  expect(await screen.findByText("hello")).toBeInTheDocument();
});
