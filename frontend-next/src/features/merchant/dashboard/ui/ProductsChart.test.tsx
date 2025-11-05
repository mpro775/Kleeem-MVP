'use client';

import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: ({ children }: any) => <div>{children}</div>,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Cell: () => <div />,
}));
import ProductsChart from "./ProductsChart";

test("يعرض رسالة عدم توفر منتجات", () => {
  renderWithProviders(<ProductsChart products={[]} />);
  expect(screen.getByText(/لا توجد بيانات منتجات لعرضها حالياً/)).toBeInTheDocument();
});
