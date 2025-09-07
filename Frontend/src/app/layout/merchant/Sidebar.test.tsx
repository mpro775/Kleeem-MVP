import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import Sidebar from "./Sidebar";
import { vi } from "vitest";

vi.mock("@/shared/hooks/useStoreServicesFlag", () => ({
  useStoreServicesFlag: () => true,
}));

test("renders sidebar menu", () => {
  renderWithProviders(
    <Sidebar open={true} onClose={() => {}} isMobile={false} />,
    { route: "/dashboard" }
  );
  expect(screen.getByText("الرئيسية")).toBeInTheDocument();
});
