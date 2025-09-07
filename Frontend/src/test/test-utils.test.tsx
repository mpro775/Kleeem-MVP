import { screen } from "@testing-library/react";
import { renderWithProviders, waitFor } from "./test-utils";
import { vi } from "vitest";

test("renderWithProviders renders children", () => {
  renderWithProviders(<div>hello</div>);
  expect(screen.getByText("hello")).toBeInTheDocument();
});

test("waitFor resolves after delay", async () => {
  vi.useFakeTimers();
  const promise = waitFor(50);
  vi.advanceTimersByTime(50);
  await expect(promise).resolves.toBeUndefined();
  vi.useRealTimers();
});
