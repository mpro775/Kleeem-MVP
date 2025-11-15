import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ConversationsSidebar from "./ConversationsSidebar";

test("يغير القناة عند الضغط على تبويب", async () => {
  const setChannel = vi.fn();
  renderWithProviders(<ConversationsSidebar selectedChannel="" setChannel={setChannel} />);
  await userEvent.click(screen.getByRole("tab", { name: "واتساب" }));
  expect(setChannel).toHaveBeenCalled();
});
