import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import KnowledgeBasePage from "./KnowledgeBasePage";
import { vi } from "vitest";

vi.mock("@/features/admin/api/adminKleem", () => ({
  listFaqs: vi.fn().mockResolvedValue([
    {
      _id: "1",
      question: "Q?",
      answer: "A",
      tags: ["t"],
      locale: "ar",
    },
  ]),
  addFaq: vi.fn(),
  deleteFaq: vi.fn(),
  importFaqs: vi.fn(),
  importFaqsFile: vi.fn(),
  reindexAllFaqs: vi.fn(),
  updateFaq: vi.fn(),
  semanticSearch: vi.fn().mockResolvedValue([]),
}));

test("shows FAQ list", async () => {
  renderWithProviders(<KnowledgeBasePage />);
  expect(await screen.findByText("Q?")).toBeInTheDocument();
});
