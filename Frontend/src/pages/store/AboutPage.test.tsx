import { screen, waitFor } from "@testing-library/react";
import AboutPage from "./AboutPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/shared/api/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { merchant: { name: "متجر" } } }),
  },
}));
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig();
  return { ...(actual as object), useParams: () => ({ slugOrId: "s1" }), useNavigate: () => vi.fn() };
});

test("loads merchant info", async () => {
  renderWithProviders(<AboutPage />);
  await waitFor(() => expect(screen.getByText("متجر")).toBeInTheDocument());
});
