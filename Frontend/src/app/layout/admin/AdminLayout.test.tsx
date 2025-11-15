import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout";


test("renders navigation and outlet", () => {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<div data-testid="content" />}></Route>
      </Route>
    </Routes>,
    { route: "/" }
  );

  expect(screen.getAllByText("لوحة التحكم")[0]).toBeInTheDocument();
  expect(screen.getByTestId("content")).toBeInTheDocument();
});
