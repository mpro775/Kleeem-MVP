import { render } from "@testing-library/react";
import ColorPickerButton from "./ColorPickerButton";
import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";

test("calls onChange when color changes", () => {
  const handle = vi.fn();
  const { container } = render(
    <ColorPickerButton colorHex="#ff0000" onChange={handle} />
  );
  const input = container.querySelector('input[type="color"]') as HTMLInputElement;
  fireEvent.change(input, { target: { value: "#00ff00" } });
  expect(handle).toHaveBeenCalledWith("#00ff00");
});
