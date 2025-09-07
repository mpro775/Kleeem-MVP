import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SafeText from "./SafeText";

describe("SafeText", () => {
  it("يجب أن يعرض النص الآمن", () => {
    render(<SafeText value="Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("يجب أن يعرض النص الفارغ كـ string فارغ", () => {
    const { container } = render(<SafeText value="" />);
    // النص الفارغ لا يعرض أي شيء
    expect(container.innerHTML).toBe("");
  });

  it("يجب أن يعرض النص null كـ string فارغ", () => {
    const { container } = render(<SafeText value={null} />);
    // null لا يعرض أي شيء
    expect(container.innerHTML).toBe("");
  });

  it("يجب أن يعرض النص undefined كـ string فارغ", () => {
    const { container } = render(<SafeText value={undefined} />);
    // undefined لا يعرض أي شيء
    expect(container.innerHTML).toBe("");
  });

  it("يجب أن يعرض النص من object", () => {
    render(<SafeText value={{ message: "Test message" }} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });
});
