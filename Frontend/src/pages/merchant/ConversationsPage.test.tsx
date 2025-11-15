import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import ConversationsPage from "./ConversationsPage";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});
vi.mock("@/features/mechant/Conversations/ChatWorkspace", () => ({
  default: ({ merchantId }: any) => <div data-testid="workspace">{merchantId}</div>,
}));


test("passes merchant id to workspace", () => {
  renderWithProviders(<ConversationsPage />);
  expect(screen.getByTestId("workspace")).toHaveTextContent("m1");
});
