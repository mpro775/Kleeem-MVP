import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import MetricsCards from "./MetricsCards";

const renderCards = (change: number) =>
  renderWithProviders(
    <MetricsCards
      sessionsCount={10}
      percentageChange={change}
      productsCount={2}
      keywordsCount={3}
      channelsCount={1}
    />
  );

test("shows up arrow when change positive", () => {
  renderCards(5);
  expect(screen.getByTestId("ArrowUpwardIcon")).toBeInTheDocument();
});

test("shows down arrow when change negative", () => {
  renderCards(-5);
  expect(screen.getByTestId("ArrowDownwardIcon")).toBeInTheDocument();
});
