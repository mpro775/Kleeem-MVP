import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ChannelCard from "./ChannelCard";

test("يستدعي onToggle عند تغيير الحالة", async () => {
  const onToggle = vi.fn();
  renderWithProviders(
    <ChannelCard
      icon={<span />}
      title="واتساب"
      enabled={false}
      onToggle={onToggle}
      onGuide={() => {}}
    />
  );
  await userEvent.click(screen.getByRole("switch"));
  expect(onToggle).toHaveBeenCalled();
});
