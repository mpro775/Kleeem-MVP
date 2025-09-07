import { screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { renderWithProviders } from "@/test/test-utils";

test("renders footer info", () => {
  const merchant: any = {
    name: "متجري",
    logoUrl: "",
    businessDescription: "",
    socialLinks: {},
    phone: "123",
    addresses: [],
    workingHours: [],
  };
  const categories: any = [{ _id: "1", name: "Cat" }];
  renderWithProviders(<Footer merchant={merchant} categories={categories} />);
  expect(screen.getByText("متجري")).toBeInTheDocument();
  expect(screen.getByText("Cat")).toBeInTheDocument();
});
