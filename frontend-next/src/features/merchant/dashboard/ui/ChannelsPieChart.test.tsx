'use client';

import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
}));
import ChannelsPieChart from "./ChannelsPieChart";

test("يعرض رسالة عدم توفر بيانات", () => {
  renderWithProviders(<ChannelsPieChart channelUsage={[]} />);
  expect(screen.getByText(/لا توجد بيانات لعرضها حالياً/)).toBeInTheDocument();
});
