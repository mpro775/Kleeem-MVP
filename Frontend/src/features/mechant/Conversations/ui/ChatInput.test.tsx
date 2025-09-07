import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, expect } from "vitest";
import ChatInput from "./ChatInput";

test("يرسل رسالة نصية", async () => {
  const onSend = vi.fn();
  renderWithProviders(<ChatInput onSend={onSend} />);
  const input = screen.getByLabelText(/حقل كتابة الرسالة/);
  await userEvent.type(input, "مرحبا");
  await userEvent.click(screen.getByLabelText(/إرسال الرسالة/));
  expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ text: "مرحبا" }));
});
