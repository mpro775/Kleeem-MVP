'use client';

import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import DashboardAdvice from "./DashboardAdvice";

test("يعرض نصائح المتجر", () => {
  renderWithProviders(<DashboardAdvice />);
  expect(screen.getByText("نصائح لتحسين أداء متجرك")).toBeInTheDocument();
});
