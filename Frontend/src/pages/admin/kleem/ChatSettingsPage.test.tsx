import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import ChatSettingsPage from "./ChatSettingsPage";
import { vi } from "vitest";

vi.mock("@/features/admin/api/adminKleem", () => ({
  getChatSettings: vi.fn().mockResolvedValue({
    launchDate: "2024",
    applyUrl: "url",
    integrationsNow: "now",
    trialOffer: "offer",
    yemenNext: "next",
    yemenPositioning: "pos",
    ctaEvery: 3,
    highIntentKeywords: ["hi"],
    piiKeywords: ["pii"],
  }),
  updateChatSettings: vi.fn(),
}));

test("loads chat settings", async () => {
  renderWithProviders(<ChatSettingsPage />);
  expect(await screen.findByText("إعدادات كليم (المحادثة)")).toBeInTheDocument();
  expect(await screen.findByDisplayValue("2024")).toBeInTheDocument();
});
