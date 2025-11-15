import { screen } from "@testing-library/react";
import ChatSettingsPage from "./ChatSettingsPage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/widget-config/model", () => ({
  useWidgetSettings: () => ({ data: null, loading: true, error: null }),
}));
vi.mock("@/features/mechant/widget-config/api", () => ({
  updateWidgetSettings: vi.fn(),
  syncWidgetSettings: vi.fn(),
}));
vi.mock("@/features/mechant/widget-config/utils", () => ({
  genWidgetSnippet: () => "",
  buildEmbedScript: () => "",
  buildChatLink: () => "",
}));
vi.mock("@/features/mechant/widget-config/ui/SectionCard", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/features/mechant/widget-config/ui/ColorPickerButton", () => ({ default: () => <div /> }));
vi.mock("@/features/mechant/widget-config/ui/PreviewPane", () => ({ default: () => <div /> }));

vi.mock("@/context/config", () => ({ API_BASE: "" }));

test("shows loading text when data missing", () => {
  renderWithProviders(<ChatSettingsPage />);
  expect(screen.getByText("جاري التحميل…")).toBeInTheDocument();
});
