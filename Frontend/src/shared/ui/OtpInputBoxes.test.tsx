import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import OtpInputBoxes from "./OtpInputBoxes";

function Wrapper({ length = 4, onComplete }: { length?: number; onComplete?: (val: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <OtpInputBoxes
      value={value}
      onChange={setValue}
      length={length}
      onComplete={onComplete}
    />
  );
}

describe("OtpInputBoxes", () => {
  it("يجب أن يعرض عدد الحقول الصحيح", () => {
    render(<Wrapper length={4} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(4);
  });

  it("يجب أن يستدعي onComplete عند إدخال جميع الأرقام", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();
    render(<Wrapper length={4} onComplete={handleComplete} />);
    const firstInput = screen.getAllByRole("textbox")[0];
    await user.type(firstInput, "1234");
    expect(handleComplete).toHaveBeenCalledWith("1234");
  });
});

