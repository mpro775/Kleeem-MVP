import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import FeedbackDialog from "./FeedbackDialog";

test("يرسل التقييم", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(<FeedbackDialog open onClose={onClose} onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText("سبب التقييم"), "سيء");
  await userEvent.click(screen.getByText("إرسال"));
  expect(onSubmit).toHaveBeenCalledWith("سيء");
});
