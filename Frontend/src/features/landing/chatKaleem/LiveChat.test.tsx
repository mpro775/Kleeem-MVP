import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { vi } from "vitest";
import LiveChat from "./LiveChat";

test("يعرض رسالة الترحيب", () => {
  const ref = { current: document.createElement("div") } as any;
  ref.current.scrollTo = vi.fn();
  renderWithProviders(<LiveChat messagesContainerRef={ref} />);
  expect(screen.getByText(/مرحباً! أنا كليم/i)).toBeInTheDocument();
});
