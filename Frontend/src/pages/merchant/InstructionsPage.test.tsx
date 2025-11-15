import { screen } from "@testing-library/react";
import InstructionsPage from "./InstructionsPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/features/mechant/instructions/api", () => ({
  listInstructions: vi.fn(() => Promise.resolve({ data: [], total: 0 })),
  createInstruction: vi.fn(),
  updateInstruction: vi.fn(),
  removeInstruction: vi.fn(),
  toggleActive: vi.fn(),
  getSuggestions: vi.fn(() => Promise.resolve([])),
  generateFromBadReplies: vi.fn(() => Promise.resolve([])),
}));

test("renders heading", () => {
  renderWithProviders(<InstructionsPage />);
  expect(screen.getByText("التوجيهات (Instructions)")).toBeInTheDocument();
});
