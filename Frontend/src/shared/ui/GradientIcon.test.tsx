import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GradientIcon from "./GradientIcon";

// Mock icon component
const MockIcon = ({ size, fill }: { size: number; fill: string }) => (
  <div data-testid="mock-icon" style={{ width: size, height: size, backgroundColor: fill }}>
    Mock Icon
  </div>
);

describe("GradientIcon", () => {
  it("يجب أن يعرض الأيقونة بشكل صحيح", () => {
    render(
      <GradientIcon 
        Icon={MockIcon} 
        startColor="#ff0000" 
        endColor="#00ff00" 
        size={24} 
      />
    );
    
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("يجب أن يطبق الأنماط المطلوبة", () => {
    const { container } = render(
      <GradientIcon 
        Icon={MockIcon} 
        startColor="#ff0000" 
        endColor="#00ff00" 
        size={24} 
      />
    );
    
    const svgElement = container.querySelector("svg");
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute("width", "24");
    expect(svgElement).toHaveAttribute("height", "24");
  });
});
