import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import PromptsPage from "./PromptsPage";
import { vi } from "vitest";

vi.mock("@/features/admin/api/adminKleem", () => ({
  listPrompts: vi.fn().mockResolvedValue([
    { _id: "1", type: "system", content: "Prompt content", name: "P1" },
  ]),
  getActiveSystemContent: vi.fn().mockResolvedValue({ content: "active" }),
  createPrompt: vi.fn(),
  updatePrompt: vi.fn(),
  setPromptActive: vi.fn(),
  archivePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  sandboxTest: vi.fn().mockResolvedValue({ reply: "ok" }),
}));

test("renders prompts list", async () => {
  renderWithProviders(<PromptsPage />);
  expect(await screen.findByText("Prompt content")).toBeInTheDocument();
});
