import { screen } from "@testing-library/react";
import StorefrontThemePage from "./StorefrontThemePage";
import { renderWithProviders } from "@/test/test-utils";
import { vi } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual: any = await vi.importActual("@/context/AuthContext");
  return { ...actual, useAuth: () => ({ user: { merchantId: "m1" } }) };
});

vi.mock("@/features/mechant/storefront-theme/hooks", () => ({
  useStorefrontTheme: () => ({
    loading: false,
    saveLoading: false,
    primaryColor: "#000",
    secondaryColor: "#fff",
    buttonStyle: "solid",
    slug: "",
    domain: "",
    snackbar: { open: false, message: "", severity: "success" },
    setPrimaryColor: vi.fn(),
    setSecondaryColor: vi.fn(),
    setButtonStyle: vi.fn(),
    setSlug: vi.fn(),
    setDomain: vi.fn(),
    handleSave: vi.fn(),
    closeSnackbar: vi.fn(),
  }),
}));

vi.mock("@/features/mechant/storefront-theme/ui/ColorPickerField", () => ({ ColorPickerField: () => <div /> }));
vi.mock("@/features/mechant/storefront-theme/ui/ButtonStyleSelect", () => ({ ButtonStyleSelect: () => <div /> }));
vi.mock("@/features/mechant/storefront-theme/ui/SlugLinkField", () => ({ SlugLinkField: () => <div /> }));


test("renders heading", () => {
  renderWithProviders(<StorefrontThemePage />);
  expect(screen.getByText("إعدادات مظهر المتجر ورابط الوصول")).toBeInTheDocument();
});
