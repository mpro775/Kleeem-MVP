import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ChatInput from "./ChatInput";

test("يرسل النص المكتوب", async () => {
  const onSend = vi.fn();
  renderWithProviders(<ChatInput onSend={onSend} />);
  const input = screen.getByRole("textbox", { name: /حقل إدخال الرسالة/i });
  await userEvent.type(input, "مرحبا");
  await userEvent.click(screen.getByRole("button", { name: /إرسال/i }));
  expect(onSend).toHaveBeenCalledWith("مرحبا");
  expect(input).toHaveValue("");
});
