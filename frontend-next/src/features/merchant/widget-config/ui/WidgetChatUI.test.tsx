'use client';

import { screen, waitFor } from "@testing-library/react";
import WidgetChatUI from "./WidgetChatUI";
import { vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/features/merchant/Conversations/api/messages", () => ({
  fetchSessionMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../hooks", () => ({ useChatWebSocket: vi.fn() }));

const settings = {
  merchantId: "m1",
  botName: "Bot",
  welcomeMessage: "مرحبا",
  brandColor: "#000",
  fontFamily: "Arial",
  headerBgColor: "#000",
  bodyBgColor: "#fff",
};

Element.prototype.scrollIntoView = vi.fn();

test("shows welcome message", async () => {
  renderWithProviders(<WidgetChatUI settings={settings} />);
  await waitFor(() => expect(screen.getByText("مرحبا")).toBeInTheDocument());
});
