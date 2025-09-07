import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import ChatPage from "./ChatPage";
import { vi } from "vitest";

vi.mock("@/shared/api/axios", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { a: 1 } }) },
}));

vi.mock("@/features/mechant/widget-config/ui/WidgetChatUI", () => ({
  default: ({ settings }: { settings: { a: number } }) => <div>Widget {settings.a}</div>,
}));

test("loads widget settings", async () => {
  renderWithProviders(
    <Routes>
      <Route path="/chat/:widgetSlug" element={<ChatPage />} />
    </Routes>,
    { route: "/chat/test" }
  );
  expect(await screen.findByText(/Widget 1/)).toBeInTheDocument();
});
