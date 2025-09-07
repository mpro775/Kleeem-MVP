import { screen } from "@testing-library/react";
import KnowledgePage from "./KnowledgePage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/knowledge/ui/DocsTab", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/knowledge/ui/LinksTab", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/knowledge/ui/FaqsTab", () => ({ default: () => <div /> }));

test("renders heading", () => {
  renderWithProviders(<KnowledgePage />);
  expect(screen.getByText("إدارة مصادر المعرفة")).toBeInTheDocument();
});
