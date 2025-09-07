import { screen } from "@testing-library/react";
import ChannelsIntegrationPage from "./ChannelsIntegrationPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/channels/ui/ChannelCard", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/channels/ui/WhatsappQrConnect", () => ({ default: () => null }));
vi.mock("@/features/mechant/channels/ui/WhatsappApiConnectDialog", () => ({ default: () => null }));
vi.mock("@/features/mechant/channels/ui/TelegramConnectDialog", () => ({ default: () => null }));
vi.mock("@/features/mechant/channels/ui/WebchatConnectDialog", () => ({ default: () => null }));

test("renders heading", () => {
  renderWithProviders(<ChannelsIntegrationPage />);
  expect(screen.getByText("إعدادات القنوات وتكاملها")).toBeInTheDocument();
});
