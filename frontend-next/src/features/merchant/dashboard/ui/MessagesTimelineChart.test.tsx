'use client';

import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));
import MessagesTimelineChart from "./MessagesTimelineChart";

test("يعرض رسالة عدم توفر بيانات", () => {
  renderWithProviders(<MessagesTimelineChart data={[]} />);
  expect(screen.getByText(/لا توجد بيانات حالياً/)).toBeInTheDocument();
});
