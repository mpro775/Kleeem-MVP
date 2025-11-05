'use client';

import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardHeader from "./DashboardHeader";
import { vi } from "vitest";

const setup = () => {
  const setRange = vi.fn();
  const refresh = vi.fn();
  renderWithProviders(
    <DashboardHeader timeRange="week" setTimeRange={setRange} onRefresh={refresh} />
  );
  return { setRange, refresh };
};

test("handles tab change", async () => {
  const { setRange } = setup();
  await userEvent.click(screen.getByRole("tab", { name: "شهر" }));
  expect(setRange).toHaveBeenCalledWith("month");
});

test("calls refresh", async () => {
  const { refresh } = setup();
  await userEvent.click(screen.getByRole("button", { name: /تحديث البيانات/i }));
  expect(refresh).toHaveBeenCalled();
});
