'use client';

import { render, screen } from "@testing-library/react";
import SectionCard from "./SectionCard";

test("renders children", () => {
  render(<SectionCard>content</SectionCard>);
  expect(screen.getByText("content")).toBeInTheDocument();
});
