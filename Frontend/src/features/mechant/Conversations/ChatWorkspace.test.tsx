import { screen } from "@testing-library/react";
import ChatWorkspace from "./ChatWorkspace";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/features/mechant/Conversations/model/queries", () => ({
  useConversations: () => ({ data: [], isLoading: false }),
  useSessionDetails: () => ({ data: null }),
  useMessages: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/features/mechant/Conversations/model/mutations", () => ({
  useHandover: () => ({ mutateAsync: vi.fn() }),
  useRate: () => ({ mutateAsync: vi.fn() }),
  useSendAgentMessage: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/features/mechant/Conversations/socket/useChatSocket", () => ({ useChatSocket: vi.fn() }));
vi.mock("@/features/mechant/Conversations/ui/Header", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("@/features/mechant/Conversations/ui/ConversationsSidebar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/features/mechant/Conversations/ui/ConversationsList", () => ({ default: () => <div data-testid="sessions" /> }));
vi.mock("@/features/mechant/Conversations/ui/ChatWindow", () => ({ default: () => <div data-testid="window" /> }));
vi.mock("@/features/mechant/Conversations/ui/ChatInput", () => ({ default: () => <div data-testid="input" /> }));
vi.mock("@/features/mechant/Conversations/ui/FeedbackDialog", () => ({ default: () => null }));


test("renders workspace layout", () => {
  renderWithProviders(<ChatWorkspace merchantId="m1" />);
  expect(screen.getByTestId("header")).toBeInTheDocument();
  expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("sessions")).toBeInTheDocument();
  expect(screen.getByTestId("window")).toBeInTheDocument();
});
